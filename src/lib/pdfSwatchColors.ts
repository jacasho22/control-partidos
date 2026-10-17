// Algunas designaciones de la FBCV no escriben el color de la equipación como texto:
// lo dibujan como un cuadrado relleno de color (con borde negro) en la celda
// CAMISETA/PANTALÓN. pdf-parse solo lee texto, así que ese color es invisible para
// extractEquipmentColors. Este módulo usa pdfjs-dist para leer el contenido gráfico
// de la página (posiciones de texto + rectángulos rellenos) y recuperar el color
// real del cuadrado, mapeado al nombre más cercano.
//
// pdfjs-dist se importa de forma DINÁMICA (no en el top del archivo) a propósito:
// pdf-parse trae embebida su propia versión antigua de pdfjs, y cargar pdfjs-dist
// como import estático al mismo tiempo que se procesa un PDF con pdf-parse rompe
// el "fake worker" interno de esa versión antigua ("No PDFJS.workerSrc specified").
// Retrasando la carga hasta que esta función se invoca (después de que pdf-parse
// ya ha terminado) se evita el choque de estado global entre ambas versiones.

export interface SwatchColors {
  localColor?: string;
  visitorColor?: string;
}

// RGB de referencia para cada nombre de color usado en las designaciones.
// Se eligen a partir de los valores reales observados en los PDFs de la FBCV
// (ej. NARANJA = 255,165,0 y AZUL OSCURO = 0,0,128 coinciden exactamente).
const COLOR_SWATCHES: { name: string; rgb: [number, number, number] }[] = [
  { name: 'NEGRO', rgb: [0, 0, 0] },
  { name: 'BLANCO', rgb: [255, 255, 255] },
  { name: 'AZUL', rgb: [0, 0, 255] },
  { name: 'AZUL OSCURO', rgb: [0, 0, 128] },
  { name: 'AZUL CLARO', rgb: [173, 216, 230] },
  { name: 'ROJO', rgb: [255, 0, 0] },
  { name: 'VERDE', rgb: [0, 128, 0] },
  { name: 'VERDE CLARO', rgb: [144, 238, 144] },
  { name: 'VERDE OSCURO', rgb: [0, 100, 0] },
  { name: 'AMARILLO', rgb: [255, 215, 0] },
  { name: 'NARANJA', rgb: [255, 165, 0] },
  { name: 'ROSA', rgb: [255, 192, 203] },
  { name: 'MORADO', rgb: [128, 0, 128] },
  { name: 'GRIS', rgb: [128, 128, 128] },
  { name: 'GRIS CLARO', rgb: [211, 211, 211] },
  { name: 'GRIS OSCURO', rgb: [105, 105, 105] },
  { name: 'CELESTE', rgb: [135, 206, 235] },
  { name: 'GRANA', rgb: [128, 0, 0] },
  { name: 'VIOLETA', rgb: [143, 0, 255] },
];

function nearestColorName(rgb: [number, number, number]): string {
  let best = COLOR_SWATCHES[0];
  let bestDist = Infinity;
  for (const candidate of COLOR_SWATCHES) {
    const dist =
      (rgb[0] - candidate.rgb[0]) ** 2 +
      (rgb[1] - candidate.rgb[1]) ** 2 +
      (rgb[2] - candidate.rgb[2]) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best.name;
}

interface TextItem {
  str: string;
  x: number;
  y: number;
}

interface FilledRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  rgb: [number, number, number];
}

// Un cuadrado de color real mide ~10-13pt de lado. El borde negro de alrededor
// se dibuja como 4 tiras finas con el mismo color (0,0,0): se descartan porque
// no son el color real de la equipación.
function isLikelySwatch(rect: FilledRect): boolean {
  const width = Math.abs(rect.x1 - rect.x0);
  const height = Math.abs(rect.y1 - rect.y0);
  const isSquareish = width >= 6 && width <= 20 && height >= 6 && height <= 20;
  const isBlack = rect.rgb[0] < 10 && rect.rgb[1] < 10 && rect.rgb[2] < 10;
  return isSquareish && !isBlack;
}

function findSwatchNear(rects: FilledRect[], x: number, y: number): FilledRect | undefined {
  return rects.find((r) => {
    const cx = (r.x0 + r.x1) / 2;
    const cy = (r.y0 + r.y1) / 2;
    return Math.abs(cx - x) < 20 && Math.abs(cy - y) < 20;
  });
}

// Tipado mínimo estructural: evitamos importar los tipos de pdfjs-dist para no
// forzar también su carga estática (ver nota de import dinámico más arriba).
interface PdfJsModule {
  getDocument: (params: { data: Uint8Array; useSystemFonts: boolean }) => { promise: Promise<PdfDocument> };
  OPS: Record<string, number>;
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

async function extractPageData(page: PdfPage, OPS: Record<string, number>): Promise<{ texts: TextItem[]; rects: FilledRect[] }> {
  const textContent = await page.getTextContent();
  const texts: TextItem[] = textContent.items
    .filter((it) => typeof it.str === 'string' && it.str.trim() !== '')
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

  return { texts, rects: rects.filter(isLikelySwatch) };
}

/**
 * Lee el PDF completo con pdfjs-dist y devuelve, para cada número de partido,
 * el color de equipación local/visitante SOLO cuando viene dibujado como
 * cuadrado de color (sin texto). Si el color ya viene como texto, no hace
 * falta usar este resultado (extractEquipmentColors ya lo captura).
 */
export async function extractSwatchColors(buffer: Buffer): Promise<Record<string, SwatchColors>> {
  const result: Record<string, SwatchColors> = {};
  const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfJsModule;
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
  const doc = await loadingTask.promise;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const { texts, rects } = await extractPageData(page, pdfjsLib.OPS);

    if (!texts.some((t) => t.str.includes('DATOS EQUIPOS'))) continue;

    const matchIdItem = texts.find((t) => /DATOS DEL PARTIDO\s+\d+/.test(t.str));
    const matchIdMatch = matchIdItem?.str.match(/DATOS DEL PARTIDO\s+(\d+)/);
    if (!matchIdMatch) continue;
    const matchId = matchIdMatch[1];

    const localHeader = texts.find((t) => t.str === 'LOCAL');
    const visitorHeader = texts.find((t) => t.str === 'VISITANTE');
    const camisetaHeaders = texts.filter((t) => t.str === 'CAMISETA');

    if (!camisetaHeaders.length) continue;
    const camisetaX = camisetaHeaders[0].x;

    const swatch: SwatchColors = {};

    if (localHeader) {
      // La fila del equipo local es la línea de texto inmediatamente debajo del header LOCAL
      const localTeamRow = texts
        .filter((t) => t.y < localHeader.y && t.x < camisetaX - 50)
        .sort((a, b) => b.y - a.y)[0];
      if (localTeamRow) {
        const hasTextColor = texts.some(
          (t) => Math.abs(t.y - localTeamRow.y) < 3 && Math.abs(t.x - camisetaX) < 10
        );
        if (!hasTextColor) {
          const rect = findSwatchNear(rects, camisetaX + 5, localTeamRow.y + 5);
          if (rect) swatch.localColor = nearestColorName(rect.rgb);
        }
      }
    }

    if (visitorHeader) {
      const visitorTeamRow = texts
        .filter((t) => t.y < visitorHeader.y && t.x < camisetaX - 50)
        .sort((a, b) => b.y - a.y)[0];
      if (visitorTeamRow) {
        const hasTextColor = texts.some(
          (t) => Math.abs(t.y - visitorTeamRow.y) < 3 && Math.abs(t.x - camisetaX) < 10
        );
        if (!hasTextColor) {
          const rect = findSwatchNear(rects, camisetaX + 5, visitorTeamRow.y + 5);
          if (rect) swatch.visitorColor = nearestColorName(rect.rgb);
        }
      }
    }

    if (swatch.localColor || swatch.visitorColor) {
      result[matchId] = swatch;
    }
  }

  return result;
}
