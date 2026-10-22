// Orquesta el parseo de una designación completa: lee el PDF una sola vez
// (pdfReader.ts) y de ahí extrae cada partido, sus equipos, colores (texto o
// cuadrado) y equipo arbitral. Pensado como punto de entrada único para que
// futuras funciones (p. ej. más campos del acta) se añadan aquí sin tocar el
// lector de bajo nivel.

import { readPdf } from './pdfReader';
import { extractEquipmentColors } from './colors';
import { findSwatchColors } from './swatchColors';
import { extractPartners, type PartnerData } from './partners';

export type { PartnerData } from './partners';

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

export async function parseDesignationPdf(buffer: Buffer): Promise<MatchData[]> {
  const { text, pages } = await readPdf(buffer);
  const swatchColorsByMatch = findSwatchColors(pages);
  const matches: MatchData[] = [];

  // El PDF tiene bloques que empiezan con el nombre de los equipos, seguido de la
  // fecha y luego "DATOS DEL PARTIDO [ID]".
  const parts = text.split(/DATOS DEL PARTIDO\s+(\d+)/);

  for (let i = 1; i < parts.length; i += 2) {
    const matchId = parts[i];
    const contentAfter = parts[i + 1] || '';
    const contentBefore = i === 1 ? parts[0] : parts[i - 1];

    const linesBefore = contentBefore
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let localTeam = '';
    let visitorTeam = '';
    let date = '';
    let time = '';

    // El nombre de los equipos suele estar justo encima de la fecha.
    for (let j = linesBefore.length - 1; j >= 0; j--) {
      const line = linesBefore[j];
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2})/);
      if (dateMatch) {
        date = dateMatch[1];
        time = dateMatch[2];
        if (j > 0) {
          const teamsLine = linesBefore[j - 1];
          if (teamsLine.includes(' - ')) {
            const teams = teamsLine.split(' - ');
            localTeam = teams[0].trim();
            visitorTeam = teams[1].trim();
          }
        }
        break;
      }
    }

    // Categoría y competición
    let category = '';
    let competition = '';
    const catCompMatch = contentAfter.match(/CATEGORÍA\s+COMPETICIÓN\s*\n([^\n]+)/);
    if (catCompMatch) {
      const combined = catCompMatch[1].trim();
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

    // Sede/Ciudad (cabecera del PDF, válida para todos los partidos del documento)
    let location = '';
    let city = '';
    const venueMatch = text.match(
      /PARA LOS PARTIDOS SIGUIENTES DEL DÍA:\s*\n([^\n]+)\n([^\n·]+)·\s*\d{5}\s+([^\n]+)/
    );
    if (venueMatch) {
      location = venueMatch[1].trim();
      city = venueMatch[3].trim();
    }

    // Colores: texto primero; si falta, caer al color dibujado como cuadrado.
    const colors = extractEquipmentColors(contentAfter);
    const swatchColors = swatchColorsByMatch[matchId];
    if (!colors.localColor && swatchColors?.localColor) colors.localColor = swatchColors.localColor;
    if (!colors.visitorColor && swatchColors?.visitorColor) colors.visitorColor = swatchColors.visitorColor;

    // Equipo arbitral
    const arbitralSection = contentAfter.split(/EQUIPO ARBITRAL/)[1] || '';
    const partners = extractPartners(arbitralSection);
    const myRole = partners.find((p) => p.role.includes('ARBITRO'))?.role || 'ARBITRO';

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
      payment: 0, // Se calcula después en el servicio de tarifas
    });
  }

  return matches;
}
