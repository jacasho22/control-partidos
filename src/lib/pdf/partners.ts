// Extrae los miembros del equipo arbitral (FUNCIÓN + NOMBRE + LICENCIA + TELÉFONO)
// de la sección "EQUIPO ARBITRAL" de una designación.

export interface PartnerData {
  role: string;
  name: string;
  license?: string;
  phone?: string;
}

const KNOWN_ROLES = [
  'ARBITRO PRINCIPAL',
  'ARBITRO AUXILIAR',
  'ANOTADOR',
  'CRONOMETRADOR',
  'AYUDANTE ANOTADOR',
  'DELEGADO DE CAMPO',
  'OPERADOR RLL',
];

export function extractPartners(section: string): PartnerData[] {
  const partners: PartnerData[] = [];
  const blocks = section.split(/FUNCIÓN\s+NOMBRE Y APELLIDOS/).slice(1);

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // El rol puede venir en una línea ("ARBITRO AUXILIAR ...") o partido en dos
    // ("ARBITRO" seguido de "PRINCIPAL" en su propia línea).
    let role = '';
    let rest = '';
    const firstLine = lines[0] ?? '';
    const matchedRole = KNOWN_ROLES.find((r) => firstLine.toUpperCase().startsWith(r));
    if (matchedRole) {
      role = matchedRole;
      rest = firstLine.slice(matchedRole.length).trim();
      if (!rest) rest = lines.slice(1).join(' ');
    } else if (firstLine.toUpperCase() === 'ARBITRO' && lines[1]?.toUpperCase() === 'PRINCIPAL') {
      role = 'ARBITRO PRINCIPAL';
      rest = lines.slice(2).join(' ');
    } else if (firstLine.toUpperCase() === 'ARBITRO' && lines[1]?.toUpperCase() === 'AUXILIAR') {
      role = 'ARBITRO AUXILIAR';
      rest = lines.slice(2).join(' ');
    } else {
      continue;
    }

    const nameMatch = rest.match(/([A-ZÁÉÍÓÚÑ.\s]+)\s*\((\d+)\)/i);
    const name = nameMatch ? nameMatch[1].trim() : rest.split('TELÉFONO')[0].trim();
    const license = nameMatch ? nameMatch[2] : undefined;

    const phoneMatch = block.match(/TELÉFONO\s+POBLACIÓN\s*\n?\s*(\d{6,9})/i);
    const phone = phoneMatch ? phoneMatch[1] : undefined;

    if (role && name) {
      partners.push({ role, name, license, phone });
    }
  }

  return partners;
}
