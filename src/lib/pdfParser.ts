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
  
  // El PDF suele tener bloques que empiezan con el nombre de los equipos,
  // seguido de la fecha y luego "DATOS DEL PARTIDO [ID]"
  const parts = text.split(/DATOS DEL PARTIDO\s+(\d+)/);
  
  // parts[0] es el texto antes del primer "DATOS DEL PARTIDO"
  // parts[1] es el ID del primer partido
  // parts[2] es el contenido del primer partido hasta el siguiente ID
  
  for (let i = 1; i < parts.length; i += 2) {
    const matchId = parts[i];
    const contentAfter = parts[i + 1] || '';
    const contentBefore = i === 1 ? parts[0] : parts[i - 1];

    // Buscar equipos y fecha en el texto anterior al ID
    const linesBefore = contentBefore.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let localTeam = '';
    let visitorTeam = '';
    let date = '';
    let time = '';

    // El nombre de los equipos suele estar 2 líneas antes de "DATOS DEL PARTIDO"
    // y la fecha 1 línea antes.
    for (let j = linesBefore.length - 1; j >= 0; j--) {
      const line = linesBefore[j];
      
      // Buscar fecha: SÁBADO 25/10/2025 - 10:00
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2})/);
      if (dateMatch && !date) {
        date = dateMatch[1];
        time = dateMatch[2];
        
        // El nombre de los equipos suele estar justo en la línea anterior a la fecha
        if (j > 0) {
          const teamsLine = linesBefore[j-1];
          if (teamsLine.includes(' - ')) {
            const teams = teamsLine.split(' - ');
            localTeam = teams[0].trim();
            visitorTeam = teams[1].trim();
          }
        }
        break;
      }
    }

    // Si no se encontró en las líneas de arriba, intentar un regex más global en el bloque anterior
    if (!localTeam) {
      const teamsMatch = contentBefore.match(/([^-]+)\s+-\s+([^\n]+)\n.*?\d{2}\/\d{2}\/\d{4}/s);
      if (teamsMatch) {
        localTeam = teamsMatch[1].trim();
        visitorTeam = teamsMatch[2].trim();
      }
    }

    // Extraer Categoría y Competición
    let category = '';
    let competition = '';
    const catCompMatch = contentAfter.match(/CATEGORÍACOMPETICIÓN\s*\n([^\n]+)/);
    if (catCompMatch) {
      const combined = catCompMatch[1].trim();
      // Intentar separar categoría de competición. 
      // Suele haber un cambio de formato o palabras clave como "Fase", "Nivel", etc.
      if (combined.includes('Fase')) {
        const index = combined.indexOf('Fase');
        category = combined.substring(0, index).trim();
        competition = combined.substring(index).trim();
      } else if (combined.includes('Copa')) {
        const index = combined.indexOf('Copa');
        category = combined.substring(0, index).trim();
        competition = combined.substring(index).trim();
      } else {
        category = combined;
      }
    }

    // Extraer Sede/Ciudad (está en la parte de arriba del PDF, difícil de asociar a cada partido si hay varios)
    // Pero en el texto debug vemos:
    // POLI MUNI ESPEÑETAS
    // C/LOS RUISES S/N · 03300 ORIHUELA
    let location = '';
    let city = '';
    const venueMatch = text.match(/PARA LOS PARTIDOS SIGUIENTES DEL DÍA:\s*\n([^\n]+)\n([^\n·]+)·\s*\d{5}\s+([^\n]+)/);
    if (venueMatch) {
      location = venueMatch[1].trim();
      city = venueMatch[3].trim();
    }

    // Extraer Colores
    const colors = extractEquipmentColors(contentAfter);

    // Extraer Compañeros (EQUIPO ARBITRAL)
    const partners: PartnerData[] = [];
    const arbitralSection = contentAfter.split(/EQUIPO ARBITRAL/)[1] || '';
    const partnerBlocks = arbitralSection.split(/FUNCIÓNNOMBRE Y APELLIDOS/);
    
    for (let k = 1; k < partnerBlocks.length; k++) {
      const pBlock = partnerBlocks[k];
      const pLines = pBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      if (pLines.length >= 2) {
        // pLines[0] es la función (puede estar en 2 líneas)
        // pLines[1] es el nombre y licencia
        let role = pLines[0];
        let nameAndLicense = pLines[1];
        
        if (role === 'ARBITRO' && pLines[1] === 'PRINCIPAL') {
          role = 'ARBITRO PRINCIPAL';
          nameAndLicense = pLines[2];
        }

        const nameMatch = nameAndLicense?.match(/([^(]+)\s+\((\d+)\)/);
        const name = nameMatch ? nameMatch[1].trim() : nameAndLicense;
        const license = nameMatch ? nameMatch[2] : '';

        // Buscar teléfono en las siguientes líneas
        let phone = '';
        const phoneMatch = pBlock.match(/TELÉFONOPOBLACIÓN\s*\n(\d{9})/);
        if (phoneMatch) {
          phone = phoneMatch[1];
        }

        partners.push({ role, name, license, phone });
      }
    }

    // Determinar mi rol (el que coincida con el nombre del usuario o simplemente buscar el que no sea anotador si soy árbitro)
    const myRole = partners.find(p => p.role.includes('ARBITRO'))?.role || 'ARBITRO';

    matches.push({
      id: matchId,
      date,
      time,
      category,
      competition,
      location,
      city,
      localTeam,
      visitorTeam,
      localColor: colors.localColor,
      visitorColor: colors.visitorColor,
      role: myRole,
      partners,
      payment: 0 // Se calculará después en el servicio de tarifas
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
