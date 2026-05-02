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
    const linesBefore = contentBefore.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    
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
    const partnerBlocks = arbitralSection.split(/FUNCIÓN\s*NOMBRE Y APELLIDOS|FUNCIÓNNOMBRE Y APELLIDOS/);
    
    for (let k = 1; k < partnerBlocks.length; k++) {
      let pBlock = partnerBlocks[k];
      
      // Corregir palabras juntas típicas de la extracción de texto del PDF
      pBlock = pBlock
        .replace(/ANOTADOR([A-ZÁÉÍÓÚ])/g, 'ANOTADOR $1')
        .replace(/CRONOMETRADOR([A-ZÁÉÍÓÚ])/g, 'CRONOMETRADOR $1')
        .replace(/AYUDANTE ANOTADOR([A-ZÁÉÍÓÚ])/g, 'AYUDANTE ANOTADOR $1')
        .replace(/ARBITRO PRINCIPAL([A-ZÁÉÍÓÚ])/g, 'ARBITRO PRINCIPAL $1')
        .replace(/TELÉFONOPOBLACIÓN/g, 'TELÉFONO POBLACIÓN')
        .replace(/(\d{9})([A-ZÁÉÍÓÚ])/g, '$1 $2'); // Separa teléfono de la población

      const pLines = pBlock.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      
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

  const colorPattern = `(?:${BASE_COLORS.join('|')})(?:\\s+(?:${BASE_COLORS.join('|')}))?`;

  const extractFromZone = (zoneText: string) => {
    // Limpiar el texto de la zona
    let text = zoneText.replace(/^CAMISETAPANTAL[OÓ]N/i, '').trim();
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
    
    let shirt = '';
    let pants = '';

    // En el PDF, los colores suelen venir debajo del nombre del equipo
    // LOCAL CAMISETA PANTALÓN
    // NOMBRE EQUIPO
    // COLOR_CAMISETA
    // /COLOR_PANTALON
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      
      // Si la línea empieza con '/', es el pantalón
      if (line.startsWith('/')) {
        pants = line.substring(1).trim();
        continue;
      }

      // Buscar colores base en la línea
      const regex = new RegExp(`\\b(${colorPattern})\\b`, 'gi');
      const matches = line.match(regex);
      
      if (matches) {
        // Si hay una barra en la línea, podría ser COLOR/COLOR
        if (line.includes('/')) {
          const parts = line.split('/');
          shirt = parts[0].trim();
          pants = parts[1].trim();
        } else {
          // Si no hay barra, la primera coincidencia es la camiseta
          if (!shirt) shirt = matches[0];
        }
      }
    }
    
    if (shirt && pants) return `${shirt} / ${pants}`;
    if (shirt) return shirt;
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
