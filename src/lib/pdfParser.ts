// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse.js';

export interface MatchData {
  id: string;
  date: string;
  time: string;
  category: string;
  competition: string;
  location: string;
  city: string;
  localTeam: string;
  visitorTeam: string;
  localColor?: string;
  visitorColor?: string;
  role: string;
  partners: PartnerData[];
  payment: number;
}

export interface PartnerData {
  role: string;
  name: string;
  license?: string;
  phone?: string;
}

/**
 * Procesa un Buffer de PDF y devuelve los partidos encontrados.
 */
export async function parseDesignationPdf(buffer: Buffer): Promise<MatchData[]> {
  const data = await pdf(buffer);
  const text = data.text;
  const matches: MatchData[] = [];
  
  // Dividir el texto por bloques de partidos
  const blocks = text.split(/DATOS DEL PARTIDO\s+/).slice(1);
  
  for (const block of blocks) {
    const lines = block.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
    if (lines.length < 5) continue;

    // ID del partido
    const matchId = lines[0].match(/^\d+/)?.[0] || '';
    
    // Fecha y hora
    const dateMatch = block.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2})/);
    const date = dateMatch?.[1] || '';
    const time = dateMatch?.[2] || '';

    // Equipos
    const teamsLine = lines.find((l: string) => l.includes(' vs '));
    const [localTeam, visitorTeam] = teamsLine ? teamsLine.split(' vs ') : ['', ''];

    // Colores de equipación
    const colors = extractEquipmentColors(block);

    // ... resto del parsing simplificado para el ejemplo
    matches.push({
      id: matchId,
      date,
      time,
      category: '',
      competition: '',
      location: '',
      city: '',
      localTeam: localTeam.trim(),
      visitorTeam: visitorTeam.trim(),
      localColor: colors.localColor,
      visitorColor: colors.visitorColor,
      role: 'ARBITRO',
      partners: [],
      payment: 0
    });
  }

  return matches;
}

export function extractEquipmentColors(block: string): { localColor?: string; visitorColor?: string } {
  const result: { localColor?: string; visitorColor?: string } = {};
  const cleanBlock = block.replace(/\r/g, '');

  const BASE_COLORS = [
    'BLANCO', 'AZUL', 'ROJO', 'VERDE', 'AMARILLO', 'NEGRO', 'NARANJA', 
    'ROSA', 'MORADO', 'GRIS', 'OSCURO', 'CLARO', 'CELESTE', 'GRANA', 'VIOLETA'
  ];

  const extractFromZone = (zoneText: string) => {
    // 1. Limpiar el texto de la zona
    let text = zoneText.replace(/^CAMISETAPANTAL[OÓ]N/i, '').trim();
    
    // 2. Dividir en líneas y buscar el color
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    
    // Colores base conocidos
    const colorPattern = `(?:${BASE_COLORS.join('|')})(?:\\s+(?:${BASE_COLORS.join('|')}))?`;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      
      // REGLA DE ORO: Si hay un par de colores repetidos (ej: AMARILLO/BLANCO AMARILLO/BLANCO),
      // el primero es la camiseta.
      const repeatedMatch = line.match(new RegExp(`\\b(${colorPattern}\\s*\\/\\s*${colorPattern})\\s+\\1\\b`, 'i'));
      if (repeatedMatch) {
        return repeatedMatch[1].toUpperCase().replace(/\s*\/\s*/g, ' / ').trim();
      }

      // PATRÓN A: Color con barra en la misma línea
      const slashRegex = new RegExp(`\\b(${colorPattern})\\s*\\/\\s*(${colorPattern})\\b`, 'gi');
      let match;
      const foundMatches = [];
      while ((match = slashRegex.exec(line)) !== null) {
        foundMatches.push({ c1: match[1].trim(), c2: match[2].trim(), full: match[0] });
      }
      
      if (foundMatches.length > 0) {
        for (const m of foundMatches) {
          if (m.c1 === 'AZUL' && line.includes('ORIHUELA AZUL') && line.indexOf(m.full) < 20 && foundMatches.length > 1) continue;
          
          // Limpiar c2 si capturó el color del pantalón de la siguiente columna
          // "AZUL CLARO /BLANCO NEGRO/BLANCO" -> c1="AZUL CLARO", c2="BLANCO NEGRO/BLANCO"
          let c2 = m.c2;
          const c2Words = c2.split(/\s+/);
          if (c2Words.length > 1) {
             // Si c2 es "BLANCO NEGRO", y hay una barra "/" después en la línea original,
             // o si simplemente parece que c2 tiene dos colores.
             // Cogemos solo la primera parte de c2 que sea un color.
             const firstWordC2 = c2Words[0].replace(/\/$/, '');
             if (BASE_COLORS.includes(firstWordC2)) {
                c2 = firstWordC2;
             }
          }

          return `${m.c1} / ${c2}`;
        }
        return `${foundMatches[0].c1} / ${foundMatches[0].c2}`;
      }

      // PATRÓN B: Color dividido entre líneas
      if (i + 1 < lines.length && lines[i+1].startsWith('/')) {
        const firstMatch = line.match(new RegExp(`(${colorPattern})$`, 'i'));
        const secondMatch = lines[i+1].match(new RegExp(`^\\/\\s*(${colorPattern})`, 'i'));
        if (firstMatch && secondMatch) {
          let c1 = firstMatch[1].trim().toUpperCase();
          let c2 = secondMatch[1].trim().toUpperCase();
          if (c1 === 'AZUL' && line.includes('ORIHUELA AZUL')) continue;
          return `${c1} / ${c2}`;
        }
      }

      // PATRÓN C: Solo un color (camiseta) sin barra
      const singleMatch = line.match(new RegExp(`\\b(${colorPattern})$`, 'i'));
      if (singleMatch) {
        const color = singleMatch[1].trim().toUpperCase();
        if (color === 'AZUL' && line.includes('ORIHUELA AZUL')) continue;
        if (i > 0 || line.length < color.length + 5) {
          return color;
        }
      }
    }
    
    return undefined;
  };

  const localMarker = "LOCALCAMISETAPANTALÓN";
  const visitorMarker = "VISITANTECAMISETAPANTALÓN";
  
  const localStart = cleanBlock.indexOf(localMarker);
  const visitorStart = cleanBlock.indexOf(visitorMarker);
  const arbitralStart = cleanBlock.search(/EQUIPO ARBITRAL|ÁRBITROS/i);

  if (localStart !== -1 && visitorStart !== -1) {
    const localZone = cleanBlock.substring(localStart + localMarker.length, visitorStart);
    result.localColor = extractFromZone(localZone);
  }

  if (visitorStart !== -1) {
    const visitorEnd = arbitralStart !== -1 ? arbitralStart : cleanBlock.length;
    const visitorZone = cleanBlock.substring(visitorStart + visitorMarker.length, visitorEnd);
    result.visitorColor = extractFromZone(visitorZone);
  }

  return result;
}
