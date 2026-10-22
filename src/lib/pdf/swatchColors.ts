// Algunas designaciones de la FBCV no escriben el color de la equipación como texto:
// lo dibujan como un cuadrado relleno de color (con borde negro) en la celda
// CAMISETA/PANTALÓN. Esta función recupera ese color a partir de los datos de página
// ya leídos por pdfReader.ts (texto + rectángulos rellenos), sin volver a abrir el PDF.

import type { PageData } from './pdfReader';
import type { EquipmentColors } from './colors';

// RGB de referencia para cada nombre de color usado en las designaciones.
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

// Un cuadrado de color real mide ~10-13pt de lado. El borde negro de alrededor se
// dibuja como tiras finas con el mismo color (0,0,0): se descartan porque no son el
// color real de la equipación.
function isLikelySwatch(rect: PageData['rects'][number]): boolean {
  const width = Math.abs(rect.x1 - rect.x0);
  const height = Math.abs(rect.y1 - rect.y0);
  const isSquareish = width >= 6 && width <= 20 && height >= 6 && height <= 20;
  const isBlack = rect.rgb[0] < 10 && rect.rgb[1] < 10 && rect.rgb[2] < 10;
  return isSquareish && !isBlack;
}

function findSwatchNear(rects: PageData['rects'], x: number, y: number) {
  return rects.find((r) => {
    const cx = (r.x0 + r.x1) / 2;
    const cy = (r.y0 + r.y1) / 2;
    return Math.abs(cx - x) < 20 && Math.abs(cy - y) < 20;
  });
}

/**
 * Para cada número de partido, devuelve el color local/visitante SOLO cuando viene
 * dibujado como cuadrado de color (sin texto). Si ya viene como texto, no hace falta
 * este resultado (extractEquipmentColors ya lo captura).
 */
export function findSwatchColors(pages: PageData[]): Record<string, EquipmentColors> {
  const result: Record<string, EquipmentColors> = {};

  for (const page of pages) {
    const { texts, rects: allRects } = page;
    const rects = allRects.filter(isLikelySwatch);
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

    const swatch: EquipmentColors = {};

    if (localHeader) {
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
