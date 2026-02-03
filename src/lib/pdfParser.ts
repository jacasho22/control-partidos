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
    const venueRegex = /PARA LOS PARTIDOS SIGUIENTES DEL DÍA:\n(.*?)\n(.*?)\n/s;
    const venueMatch = text.match(venueRegex);
    const globalVenue = venueMatch ? venueMatch[1].trim() : '';
    const globalAddress = venueMatch ? venueMatch[2].trim() : '';

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
  } catch (error: any) {
    console.error('Error fatal en el parser de PDF:', error);
    throw new Error(`Error al interpretar el PDF: ${error.message}`);
  }
}
