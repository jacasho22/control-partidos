// @ts-expect-error - no type definitions for this internal entry point
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

  // La extracción de color por "cuadrado" (pdfjs-dist) se desactivó: su propio fallo
  // interno de configuración del worker dejaba estado global corrupto en el proceso
  // del servidor que hacía fallar intermitentemente el parseo de PDFs *posteriores*
  // en la misma instancia (error "Invalid PDF structure" en archivos perfectamente
  // válidos). Detectar bien los partidos es más importante que pintar ese color, así
  // que de momento solo se usa el color en texto (extractEquipmentColors).

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

    // Extraer Colores (solo texto; ver nota arriba sobre el color por cuadrado desactivado)
    const colors = extractEquipmentColors(contentAfter);

    // Extraer Compañeros (EQUIPO ARBITRAL)
    const partners: PartnerData[] = [];
    const arbitralSection = contentAfter.split(/EQUIPO ARBITRAL/)[1] || '';
    
    // El PDF suele listar los oficiales uno tras otro. 
    // Buscamos patrones de FUNCIÓN + NOMBRE (LICENCIA)
    const partnerRegex = /(ARBITRO\s+PRINCIPAL|ARBITRO\s+AUXILIAR|ANOTADOR|CRONOMETRADOR|AYUDANTE\s+ANOTADOR|DELEGADO\s+DE\s+CAMPO)(?:(?!\d{9}).)*?\s+([A-ZÁÉÍÓÚ\s,]+)\s*\((\d+)\)(?:.*?(?:TELÉFONO|TELÉFONOPOBLACIÓN)\s*(\d{9}))?/gs;
    
    let m;
    while ((m = partnerRegex.exec(arbitralSection)) !== null) {
      const role = m[1].trim();
      const name = m[2].trim();
      const license = m[3];
      const phone = m[4] || '';
      
      partners.push({ role, name, license, phone });
    }

    // Si el regex no capturó nada, intentar el método de bloques pero más flexible
    if (partners.length === 0) {
      const partnerBlocks = arbitralSection.split(/FUNCIÓN\s*NOMBRE Y APELLIDOS|FUNCIÓNNOMBRE Y APELLIDOS/);
      for (let k = 1; k < partnerBlocks.length; k++) {
        let pBlock = partnerBlocks[k];
        
        // Limpiar el bloque de ruidos de extracción
        pBlock = pBlock
          .replace(/TELÉFONOPOBLACIÓN/g, 'TELÉFONO POBLACIÓN')
          .replace(/(\d{9})([A-ZÁÉÍÓÚ])/g, '$1 $2');

        const pLines = pBlock.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        
        if (pLines.length >= 2) {
          let role = '';
          let nameAndLicense = '';
          
          // Detectar rol y nombre en las primeras líneas
          const firstLine = pLines[0].toUpperCase();
          if (firstLine.includes('ARBITRO') || firstLine.includes('ANOTADOR') || firstLine.includes('CRONOMETRADOR')) {
            role = pLines[0];
            nameAndLicense = pLines[1];
            // Caso especial "ARBITRO" + "PRINCIPAL" en líneas distintas
            if (role === 'ARBITRO' && pLines[1] === 'PRINCIPAL') {
              role = 'ARBITRO PRINCIPAL';
              nameAndLicense = pLines[2];
            }
          }

          if (role && nameAndLicense) {
            const nameMatch = nameAndLicense.match(/([^(]+)\s+\((\d+)\)/);
            const name = nameMatch ? nameMatch[1].trim() : nameAndLicense;
            const license = nameMatch ? nameMatch[2] : '';
            const phoneMatch = pBlock.match(/(?:TELÉFONO|TELÉFONO POBLACIÓN)\s*(\d{9})/i);
            const phone = phoneMatch ? phoneMatch[1] : '';
            
            partners.push({ role, name, license, phone });
          }
        }
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
    'ROSA', 'MORADO', 'GRIS', 'CELESTE', 'GRANA', 'VIOLETA'
  ];
  // Los únicos modificadores de dos palabras reales son CLARO/OSCURO (ej. "AZUL OSCURO").
  // No se permite cualquier color como segunda palabra: eso haría que la regex se comiera
  // por error el color de la columna PANTALÓN de al lado (ej. "ROJO BLANCO" en
  // "BLANCO/ROJO BLANCO/ROJO", donde "BLANCO" pertenece a la siguiente columna).
  const MODIFIERS = ['CLARO', 'OSCURO'];

  const colorPattern = `(?:${BASE_COLORS.join('|')})(?:\\s+(?:${MODIFIERS.join('|')}))?`;
  // Color compuesto: "AZUL OSCURO" o "NEGRO/BLANCO" (dos tonos), sin espacios junto a la barra
  // para no fundirse con la siguiente columna (pantalón) que viene separada por espacio.
  const compoundPattern = `${colorPattern}(?:\\/${colorPattern})?`;
  const compoundRegex = new RegExp(`\\b(${compoundPattern})\\b`, 'i');
  // pdf-parse a veces pega el nombre del equipo directamente al color sin ningún
  // separador ("CB CASTELLONNEGRO/NEGRONEGRO/NEGRO"), lo que rompe el \b de arriba:
  // no hay transición letra/no-letra antes del color real, pero sí puede haberla
  // más adelante por casualidad (p.ej. al final de la cadena), haciendo que el
  // regex con \b encuentre una coincidencia válida pero en la posición EQUIVOCADA
  // (la columna pantalón en vez de la camiseta). Para cubrir el caso sin límites
  // de palabra usamos dos heurísticas adicionales sin \b:
  // 1) el color se repite pegado justo a sí mismo (columna camiseta + columna
  //    pantalón con el mismo valor, ambas sin espacio): referencia inversa.
  // 2) el color es lo último de la línea (nombre de equipo pegado a un color que
  //    no se repite en esta línea, p.ej. porque el pantalón va en otra línea).
  // Nos quedamos siempre con la coincidencia que empieza más a la izquierda entre
  // las tres estrategias, porque la camiseta (lo que queremos) va siempre primero.
  const duplicatedRegex = new RegExp(`(${compoundPattern})\\1`, 'i');
  const endOfLineRegex = new RegExp(`(${compoundPattern})$`, 'i');

  const matchColorOnLine = (line: string): string | undefined => {
    const candidates = [
      line.match(compoundRegex),
      line.match(duplicatedRegex),
      line.match(endOfLineRegex),
    ].filter((m): m is RegExpMatchArray => m !== null && m.index !== undefined);

    if (candidates.length === 0) return undefined;

    const earliest = candidates.reduce((best, current) =>
      (current.index as number) < (best.index as number) ? current : best
    );
    return earliest[1];
  };

  const extractFromZone = (zoneText: string) => {
    // Limpiar el texto de la zona
    const text = zoneText.replace(/^\s*CAMISETA\s+PANTAL[OÓ]N/i, '').trim();
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

    // Solo nos interesa la CAMISETA (primera columna). El color puede venir:
    // - en la misma línea del equipo: "EQUIPO AZUL OSCURO AZUL OSCURO" (repetido por la 2ª columna)
    // - en la misma línea con dos tonos: "EQUIPO BLANCO/ROJO BLANCO/ROJO"
    // - en dos líneas (base + accesorio): "EQUIPO AZUL OSCURO" seguido de "/AMARILLO"
    // Algunos equipos no tienen color en texto (se representa como icono/imagen en el PDF),
    // en ese caso no hay nada que extraer y se devuelve undefined.
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      if (line.startsWith('/')) continue; // línea de accesorio huérfana, ya se habría consumido

      const matchedColor = matchColorOnLine(line);
      if (!matchedColor) continue;

      let shirt = matchedColor;

      // Si el color encontrado no trae ya su propio tono (sin '/'), comprobar si la línea
      // siguiente es un accesorio tipo "/AMARILLO" que completa el color de la camiseta.
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
  };

  // pdf-parse a veces concatena las columnas sin ningún espacio ("LOCALCAMISETAPANTALÓN")
  // y otras veces las separa con espacios ("LOCAL CAMISETA PANTALÓN"), según el PDF.
  const localMarkerRegex = /LOCAL\s*CAMISETA\s*PANTAL[OÓ]N/i;
  const visitorMarkerRegex = /VISITANTE\s*CAMISETA\s*PANTAL[OÓ]N/i;

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
