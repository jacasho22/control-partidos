// @ts-expect-error - Importing from internal lib to bypass buggy index.js in pdf-parse 1.1.1
import pdf from 'pdf-parse/lib/pdf-parse.js';
import fs from 'fs';

export interface Partner {
  role: string;
  name: string;
  phone?: string;
}

export interface ParsedMatch {
  matchNumber: string;
  date: string; // Formato DD/MM/YYYY
  time: string; // Formato HH:MM
  venue: string;
  venueAddress: string;
  localTeam: string;
  visitorTeam: string;
  category: string;
  division: string;
  role: string;
  matchday?: number;
  partners?: Partner[];
  localColor?: string;
  visitorColor?: string;
}

export async function parseDesignationPDF(buffer: Buffer): Promise<ParsedMatch[]> {
  try {
    console.log('--- Iniciando procesamiento de PDF (Extracción Robusta) ---');
    const data = await pdf(buffer);
    const text = data.text;
    
    // Guardar para debug si es necesario
    if (process.env.NODE_ENV === 'development') {
      fs.writeFileSync('debug_pdf_text.txt', text);
    }

    if (!text || text.length < 50) {
      throw new Error('El PDF no contiene texto extraíble.');
    }

    // 1. Extraer Local y Dirección Global (Suelen estar al principio)
    // 1. Extraer Local y Dirección Global (Suelen estar al principio)
    const venueRegex = /PARA LOS PARTIDOS SIGUIENTES DEL DÍA:\n(.*?)\n(.*?)\n/s;
    const venueMatch = text.match(venueRegex);
    let globalVenue = venueMatch ? venueMatch[1].trim() : '';
    let globalAddress = venueMatch ? venueMatch[2].trim() : '';

    // FALLBACK: Si el regex estricto falla, buscar patrón de dirección por fuerza bruta en el encabezado
    if (!globalAddress) {
       console.log('Regex estricto de cabecera falló. Intentando búsqueda por Código Postal...');
       const headerText = text.substring(0, 1000); // Analizar solo el principio
       const lines = headerText.split('\n');
       
       for (let i = 0; i < lines.length; i++) {
         const line = lines[i].trim();
         // Buscar línea con Código Postal (5 dígitos)
         if (line.match(/\b\d{5}\b/)) {
            globalAddress = line;
            console.log(`Dirección detectada por CP: ${globalAddress}`);
            
            // Asumir que la línea anterior es el nombre del pabellón si está vacía
            if (!globalVenue && i > 0) {
              globalVenue = lines[i-1].trim();
              console.log(`Pabellón inferido: ${globalVenue}`);
            }
            break;
         }
       }
    }

    // 2. Extraer Nombre del Árbitro para buscar su función
    const userMatch = text.match(/COMITÉ DE ÁRBITROS\n\d+\n(.*?)\nHAS SIDO DESIGNADO/);
    const userName = userMatch ? userMatch[1].trim() : '';
    console.log('Árbitro detectado:', userName);

    // 3. Extraer bloques usando "DATOS DEL PARTIDO" (Sección de resumen más limpia)
    const matches: ParsedMatch[] = [];
    const summaryBlocks = text.split(/DATOS DEL PARTIDO\s+/).slice(1);

    for (const block of summaryBlocks) {
      try {
        const match: Partial<ParsedMatch> = {
          partners: []
        };
        
        // El número de partido está al principio del bloque
        const numMatch = block.match(/^(\d+)/);
        if (numMatch) {
          match.matchNumber = numMatch[1];
        } else {
          continue;
        }

        // Buscar en el texto previo al bloque para equipos y fecha/hora
        const previousTextParts = text.split(`DATOS DEL PARTIDO ${match.matchNumber}`);
        const previousText = previousTextParts[0];
        const lines = previousText.trim().split('\n');
        
        if (lines.length >= 2) {
          const dateTimeLine = lines[lines.length - 1];
          const teamsLine = lines[lines.length - 2];
          
          const dtMatch = dateTimeLine.match(/(\d{2}\/\d{2}\/\d{4})\s+-\s+(\d{2}:\d{2})/);
          if (dtMatch) {
            match.date = dtMatch[1];
            match.time = dtMatch[2];
            
            const teams = teamsLine.split(' - ');
            if (teams.length >= 2) {
              match.localTeam = teams[0].trim();
              match.visitorTeam = teams[1].trim();
            }
          }
        }

        // Categoría y Competición
        const catMatch = block.match(/CATEGORÍACOMPETICIÓN\n(.*?)\n/);
        if (catMatch) {
          const fullCat = catMatch[1].trim();
          const parts = fullCat.match(/^(.*?)\s+(IR|Nivel|Campeonato|FAP|Fase)/i);
          if (parts) {
            match.category = parts[1].trim();
            match.division = fullCat.replace(parts[1], '').trim();
          } else {
            match.category = fullCat;
            match.division = '';
          }
        }

        // --- Extracción de COLORES DE EQUIPACIÓN ---
        const { localColor, visitorColor } = extractEquipmentColors(block);
        match.localColor = localColor;
        match.visitorColor = visitorColor;

        // --- Extracción de EQUIPO ARBITRAL ---
        const squadSectionMatch = block.match(/EQUIPO ARBITRAL\s+([\s\S]*?)(?=\nÁRBITROS -|$)/);
        if (squadSectionMatch) {
          const squadText = squadSectionMatch[1];
          // Dividir por cada persona (comienza con FUNCIÓNNOMBRE Y APELLIDOS)
          const personBlocks = squadText.split(/FUNCIÓNNOMBRE Y APELLIDOS/);
          
          for (const pBlock of personBlocks) {
            if (!pBlock.trim()) continue;
            
              // Buscar Nombre con Licencia: Nombre (XXXX)
              // Usamos un regex que busque el patrón de la licencia al final
              const nameIdMatch = pBlock.match(/(.*?)\s*\(\d+\)/);
              if (nameIdMatch) {
                const fullTextBeforePhone = nameIdMatch[0].trim();
                
                // Roles conocidos para limpiar el nombre
                const knownRoles = [
                  'ARBITRO PRINCIPAL',
                  'ARBITRO AUXILIAR',
                  'ANOTADOR',
                  'CRONOMETRADOR',
                  'OPERADOR 24"',
                  'OPERADOR 24',
                  'COORDINADOR'
                ];

                let detectedRole = 'ARBITRO';
                let cleanedName = fullTextBeforePhone;

                // Intentar extraer el rol que está al principio
                for (const role of knownRoles) {
                  if (cleanedName.toUpperCase().startsWith(role)) {
                    detectedRole = role;
                    cleanedName = cleanedName.substring(role.length).trim();
                    break;
                  }
                }

                // Limpiar espacios múltiples y caracteres extraños
                cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
                
                // El teléfono está después de TELÉFONOPOBLACIÓN
                const phoneMatch = pBlock.match(/TELÉFONOPOBLACIÓN\n?(\d+)/);
                const phone = phoneMatch ? phoneMatch[1].trim() : undefined;
                
                match.partners?.push({
                  role: detectedRole,
                  name: cleanedName,
                  phone: phone
                });
              }
          }
        }

        // Detectar Rol (Función del usuario actual)
        // Buscamos cuál de los partners coincide con el usuario detectado al principio
        if (userName && match.partners) {
          const myPartner = match.partners.find(p => p.name.includes(userName));
          if (myPartner) {
            match.role = myPartner.role;
          }
        }

        // Fallback si no se detectó por partners
        if (!match.role) {
          const blockLower = block.toLowerCase().replace(/\s+/g, '');
          const rolePatterns = [
            { role: 'ARBITRO PRINCIPAL', search: 'arbitroprincipal' },
            { role: 'ARBITRO AUXILIAR', search: 'arbitroauxiliar' },
            { role: 'ANOTADOR', search: 'anotador' },
            { role: 'CRONOMETRADOR', search: 'cronometrador' }
          ];

          for (const pattern of rolePatterns) {
            if (blockLower.includes(pattern.search)) {
              match.role = pattern.role;
              break;
            }
          }
        }

        // Segundo fallback
        if (!match.role) {
          const manualBlockSplit = text.split(`NÚM.PARTIDO ${match.matchNumber}`)[1];
          if (manualBlockSplit) {
            const roleMatch = manualBlockSplit.match(/FUNCIÓ[NÓ]JORNADA\n(.*?)\s+(\d+)/);
            if (roleMatch) {
              match.role = roleMatch[1].trim();
              const jrn = parseInt(roleMatch[2]);
              match.matchday = isNaN(jrn) ? undefined : jrn;
            }
          }
        }

        if (!match.role) match.role = 'ARBITRO PRINCIPAL'; // Fallback final

        match.venue = globalVenue;
        match.venueAddress = globalAddress;

        // Intentar extraer localidad más específica del bloque si existe
        let blockLocality = '';
        const localityMatch = block.match(/LOCALIDAD[:\s]+(.*?)\n/i);
        if (localityMatch) {
          blockLocality = localityMatch[1].trim(); 
        }

        // Si no hay localidad en el bloque, intentar extraerla del encabezado global (p.ej. "PABELLON - CIUDAD")
        if (!blockLocality && globalVenue.includes('-')) {
          blockLocality = globalVenue.split('-').pop()?.trim() || '';
        }

        match.venueAddress = blockLocality || globalAddress;

        // MEJORA: Extracción robusta basada en Código Postal (5 dígitos)
        // Ejemplo: "C/ DENIA, 2-4 · 03690 SAN VICENTE DEL RASPEIG" -> "03690 SAN VICENTE DEL RASPEIG"
        const addressSource = blockLocality || globalAddress || globalVenue;
        const zipMatch = addressSource.match(/\b(\d{5})\s+(.*)/);
        if (zipMatch) {
           // Si encontramos CP + Ciudad, usamos eso como la dirección canónica
           // Esto es mucho más preciso para la geolocalización
           match.venueAddress = `${zipMatch[1]} ${zipMatch[2].trim()}`;
        }

        if (match.matchNumber && match.localTeam) {
          matches.push(match as ParsedMatch);
        }
      } catch (err) {
        console.error(`Error procesando bloque del partido ${block.substring(0, 20)}:`, err);
      }
    }

    const uniqueMatches = Array.from(new Map(matches.map(m => [m.matchNumber, m])).values());
    console.log(`Extracción completada: ${uniqueMatches.length} partidos encontrados con sus respectivos compañeros.`);

    return uniqueMatches;
  } catch (error) {
    const err = error as Error;
    console.error('Error fatal en el parser de PDF:', err);
    throw new Error(`Error al interpretar el PDF: ${err.message}`);
  }
}

export function extractEquipmentColors(block: string): { localColor?: string; visitorColor?: string } {
  const result: { localColor?: string; visitorColor?: string } = {};

  const cleanBlock = block.replace(/\r/g, '');

  const extractFromZone = (zoneText: string) => {
    // 1. Limpiar el texto de la zona
    let text = zoneText.replace(/^CAMISETAPANTAL[OÓ]N/i, '').trim();
    
    // 2. Dividir en líneas y buscar patrones de colores
    // En el PDF, los colores aparecen en líneas independientes DESPUÉS del nombre del equipo.
    // El nombre del equipo puede ocupar 1 o 2 líneas.
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return undefined;

    // Colores base conocidos (en mayúsculas)
    const BASE_COLORS = ['BLANCO', 'AZUL', 'ROJO', 'VERDE', 'AMARILLO', 'NEGRO', 'NARANJA', 'ROSA', 'MORADO', 'GRIS', 'OSCURO', 'CLARO', 'CELESTE', 'GRANA', 'VIOLETA'];
    const CONTROL_WORDS = ['CAMISETA', 'PANTALÓN', 'PANTALON', 'LOCAL', 'VISITANTE', 'EQUIPO', 'DATOS', 'PARTIDO'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const words = line.split(/[\s/]+/);
      const isAllCaps = words.every(w => /^[A-ZÁÉÍÓÚ]{3,}$/.test(w));
      const hasBaseColor = words.some(w => BASE_COLORS.includes(w));
      const hasControlWord = words.some(w => CONTROL_WORDS.includes(w));

      if (isAllCaps && hasBaseColor && !hasControlWord) {
        // CASO CRÍTICO: "EDM ORIHUELA AZUL" es un nombre de equipo. 
        // El color real suele estar solo o con una barra (AMARILLO/BLANCO).
        // Si la línea tiene muchas palabras (> 2) y estamos al principio, probablemente sea el equipo.
        if (i < 2 && words.length > 2) {
          // Si el nombre del equipo es "EDM ORIHUELA AZUL", lo saltamos para buscar el color real
          continue; 
        }

        let color = line;
        
        // Si el color es algo como "AZUL OSCURO", y la siguiente línea es "/BLANCO"
        if (i + 1 < lines.length && lines[i+1].startsWith('/')) {
          color += ` ${lines[i+1]}`;
        }
        
        // Limpiar el formato final (ej: "VERDE CLARO /BLANCO" -> "VERDE CLARO / BLANCO")
        return color.replace(/\s*\/\s*/g, ' / ').trim();
      }
    }
    
    return undefined;
  };

  // Extraer zona Local: Todo entre "LOCAL" (seguido de CAMISETA) y "VISITANTE"
  const localParts = cleanBlock.split(/LOCAL\s*CAMISETA\s*PANTAL[OÓ]N/i);
  if (localParts.length > 1) {
    const localContent = localParts[1].split(/VISITANTE/i)[0];
    result.localColor = extractFromZone(localContent);
  }

  // Extraer zona Visitante: Todo entre "VISITANTE" (seguido de CAMISETA) y "EQUIPO ARBITRAL"
  const visitorParts = cleanBlock.split(/VISITANTE\s*CAMISETA\s*PANTAL[OÓ]N/i);
  if (visitorParts.length > 1) {
    const visitorContent = visitorParts[1].split(/EQUIPO ARBITRAL|ÁRBITROS/i)[0];
    result.visitorColor = extractFromZone(visitorContent);
  }

  return result;
}
