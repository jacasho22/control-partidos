// Extrae el color de equipación (camiseta) desde el bloque de texto "DATOS EQUIPOS"
// de una designación. Con el nuevo lector (pdfjs-dist, ver pdfReader.ts) el texto
// viene con espacios correctos entre palabras, así que no hace falta ninguna
// heurística especial para columnas pegadas sin espacio.

export interface EquipmentColors {
  localColor?: string;
  visitorColor?: string;
}

const BASE_COLORS = [
  'BLANCO', 'AZUL', 'ROJO', 'VERDE', 'AMARILLO', 'NEGRO', 'NARANJA',
  'ROSA', 'MORADO', 'GRIS', 'CELESTE', 'GRANA', 'VIOLETA',
];
// Los únicos modificadores de dos palabras reales son CLARO/OSCURO (ej. "AZUL OSCURO").
const MODIFIERS = ['CLARO', 'OSCURO'];

const colorPattern = `(?:${BASE_COLORS.join('|')})(?:\\s+(?:${MODIFIERS.join('|')}))?`;
// Color compuesto: "AZUL OSCURO" o "NEGRO/BLANCO" (dos tonos).
const compoundPattern = `${colorPattern}(?:\\/${colorPattern})?`;
const compoundRegex = new RegExp(`\\b(${compoundPattern})\\b`, 'i');

function extractFromZone(zoneText: string): string | undefined {
  const text = zoneText.replace(/^\s*CAMISETA\s+PANTAL[OÓ]N/i, '').trim();
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // Solo nos interesa la CAMISETA (primera columna). El color puede venir:
  // - en la misma línea del equipo: "EQUIPO AZUL OSCURO AZUL OSCURO" (repetido por la 2ª columna)
  // - en la misma línea con dos tonos: "EQUIPO BLANCO/ROJO BLANCO/ROJO"
  // - en dos líneas (base + accesorio): "EQUIPO AZUL OSCURO" seguido de "/AMARILLO"
  // Algunos equipos no tienen color en texto (va dibujado como cuadrado), en ese
  // caso no hay nada que extraer y se devuelve undefined.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    if (line.startsWith('/')) continue; // línea de accesorio huérfana, ya se habría consumido

    const match = line.match(compoundRegex);
    if (!match) continue;

    let shirt = match[1];

    if (!shirt.includes('/')) {
      const nextLine = lines[i + 1]?.trim();
      if (nextLine?.startsWith('/')) {
        const accentMatch = nextLine.substring(1).toUpperCase().match(compoundRegex);
        if (accentMatch) shirt = `${shirt}/${accentMatch[1]}`;
      }
    }

    return shirt;
  }

  return undefined;
}

export function extractEquipmentColors(block: string): EquipmentColors {
  const result: EquipmentColors = {};
  const cleanBlock = block.replace(/\r/g, '');

  const localMarkerRegex = /LOCAL\s+CAMISETA\s+PANTAL[OÓ]N/i;
  const visitorMarkerRegex = /VISITANTE\s+CAMISETA\s+PANTAL[OÓ]N/i;

  const localMatch = cleanBlock.match(localMarkerRegex);
  const visitorMatch = cleanBlock.match(visitorMarkerRegex);
  const localStart = localMatch?.index ?? -1;
  const visitorStart = visitorMatch?.index ?? -1;
  const arbitralStart = cleanBlock.search(/EQUIPO ARBITRAL|ÁRBITROS/i);

  if (localStart !== -1 && visitorStart !== -1 && localMatch) {
    const localZone = cleanBlock.substring(localStart + localMatch[0].length, visitorStart);
    result.localColor = extractFromZone(localZone);
  }

  if (visitorStart !== -1 && visitorMatch) {
    const visitorEnd = arbitralStart !== -1 ? arbitralStart : cleanBlock.length;
    const visitorZone = cleanBlock.substring(visitorStart + visitorMatch[0].length, visitorEnd);
    result.visitorColor = extractFromZone(visitorZone);
  }

  return result;
}
