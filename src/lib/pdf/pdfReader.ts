// Lector de PDF único para todo el sistema de designaciones: usa pdfjs-dist (moderno,
// mantenido) en vez de la librería anterior (pdf-parse, que embebe un pdfjs de 2017
// y resultó poco fiable en el entorno serverless de producción: fallaba de forma
// intermitente con "Invalid PDF structure" en PDFs perfectamente válidos). Lee cada
// página una sola vez y expone tanto el texto reconstruido (para las expresiones
// regulares que detectan partidos) como las posiciones de texto y los rectángulos
// rellenos (para detectar colores de equipación dibujados como cuadrado en vez de
// texto), evitando cargar la librería dos veces por PDF.
//
// pdfjs-dist, al no correr en un Worker real, carga su propio "fake worker" con un
// `import()` dinámico de una ruta RELATIVA ("./pdf.worker.mjs"). En el bundle de
// Vercel esa ruta relativa ya no apunta a ningún archivo real y falla con "Setting
// up fake worker failed: Cannot find module...". Se evita resolviendo nosotros
// mismos la ruta ABSOLUTA real del archivo en node_modules (vía require.resolve) y
// pasándosela a pdfjs-dist, en vez de dejar que adivine la ruta relativa.

import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const nodeRequire = createRequire(import.meta.url);

export interface TextItem {
  str: string;
  x: number;
  y: number;
}

export interface FilledRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  rgb: [number, number, number];
}

export interface PageData {
  texts: TextItem[];
  rects: FilledRect[];
}

export interface PdfData {
  text: string;
  pages: PageData[];
}

// Tipado mínimo estructural: evitamos importar los tipos de pdfjs-dist directamente.
interface PdfJsModule {
  getDocument: (params: { data: Uint8Array; useSystemFonts: boolean }) => { promise: Promise<PdfDocument> };
  OPS: Record<string, number>;
  GlobalWorkerOptions: { workerSrc: string };
}
interface PdfDocument {
  numPages: number;
  getPage: (pageNum: number) => Promise<PdfPage>;
}
interface PdfPage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTextContent: () => Promise<{ items: any[] }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOperatorList: () => Promise<{ fnArray: number[]; argsArray: any[] }>;
}

async function readPage(page: PdfPage, OPS: Record<string, number>): Promise<PageData> {
  const textContent = await page.getTextContent();
  const texts: TextItem[] = textContent.items
    .filter((it) => typeof it.str === 'string' && it.str !== '')
    .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));

  const opList = await page.getOperatorList();
  const rects: FilledRect[] = [];
  let currentFill: [number, number, number] | null = null;
  let currentPath: number[] | null = null;

  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i];
    const args = opList.argsArray[i];

    if (fn === OPS.setFillRGBColor) {
      currentFill = [args[0], args[1], args[2]];
    } else if (fn === OPS.constructPath) {
      currentPath = args[1] as number[];
    } else if ((fn === OPS.fill || fn === OPS.eoFill || fn === OPS.fillStroke) && currentFill && currentPath) {
      const xs = currentPath.filter((_, idx) => idx % 2 === 0);
      const ys = currentPath.filter((_, idx) => idx % 2 === 1);
      rects.push({
        x0: Math.min(...xs),
        y0: Math.min(...ys),
        x1: Math.max(...xs),
        y1: Math.max(...ys),
        rgb: currentFill,
      });
    }
  }

  return { texts, rects };
}

// Reconstruye el texto de una página igual que lo hacía pdf-parse: concatena los
// ítems de texto sin espacio mientras estén en la misma línea (misma Y) y añade un
// salto de línea al cambiar de Y. No inserta espacios entre ítems: si el PDF no deja
// hueco entre dos fragmentos de texto, el texto resultante tampoco lo tendrá.
function reconstructPageText(texts: TextItem[]): string {
  let text = '';
  let lastY: number | undefined;
  for (const item of texts) {
    if (lastY === item.y || lastY === undefined) {
      text += item.str;
    } else {
      text += '\n' + item.str;
    }
    lastY = item.y;
  }
  return text;
}

export async function readPdf(buffer: Buffer): Promise<PdfData> {
  const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    const workerPath = nodeRequire.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  }
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
  const doc = await loadingTask.promise;

  const pages: PageData[] = [];
  let text = '';
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const pageData = await readPage(page, pdfjsLib.OPS);
    pages.push(pageData);
    text += `\n\n${reconstructPageText(pageData.texts)}`;
  }

  return { text, pages };
}
