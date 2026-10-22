import { describe, it, expect } from 'vitest';
import { extractPartners } from './partners';

// Texto real (reconstruido por pdfReader.ts) de la sección EQUIPO ARBITRAL.
const REAL_ARBITRAL_SECTION = `
EQUIPO ARBITRAL
FUNCIÓN NOMBRE Y APELLIDOS
ARBITRO
PRINCIPAL
ENRIQUE DOMINGUEZ MARTINEZ
(120283)
TELÉFONO POBLACIÓN
649816342 CASTELLÓN DE LA PLANA
/CASTELLÓ
FUNCIÓN NOMBRE Y APELLIDOS
ARBITRO AUXILIAR VERONICA GARCIA TERUEL (31781)
TELÉFONO POBLACIÓN
603040860 CASTELLÓN DE LA PLANA
/CASTELLÓ
FUNCIÓN NOMBRE Y APELLIDOS
ANOTADOR MARCO GALLEGO GARCIA (121174)
TELÉFONO POBLACIÓN
644583362 VILLARREAL/VILA-REAL
FUNCIÓN NOMBRE Y APELLIDOS
CRONOMETRADOR MUAD A ALGHUG (121159)
`;

describe('extractPartners', () => {
  it('extracts a role split across two lines (ARBITRO / PRINCIPAL)', () => {
    const partners = extractPartners(REAL_ARBITRAL_SECTION);
    const principal = partners.find((p) => p.role === 'ARBITRO PRINCIPAL');
    expect(principal).toBeDefined();
    expect(principal?.name).toBe('ENRIQUE DOMINGUEZ MARTINEZ');
    expect(principal?.license).toBe('120283');
    expect(principal?.phone).toBe('649816342');
  });

  it('extracts a role on a single line (ARBITRO AUXILIAR)', () => {
    const partners = extractPartners(REAL_ARBITRAL_SECTION);
    const auxiliar = partners.find((p) => p.role === 'ARBITRO AUXILIAR');
    expect(auxiliar).toBeDefined();
    expect(auxiliar?.name).toBe('VERONICA GARCIA TERUEL');
    expect(auxiliar?.license).toBe('31781');
    expect(auxiliar?.phone).toBe('603040860');
  });

  it('extracts all four officials from the section', () => {
    const partners = extractPartners(REAL_ARBITRAL_SECTION);
    expect(partners.map((p) => p.role)).toEqual([
      'ARBITRO PRINCIPAL',
      'ARBITRO AUXILIAR',
      'ANOTADOR',
      'CRONOMETRADOR',
    ]);
  });

  it('returns an empty list for an empty section', () => {
    expect(extractPartners('')).toEqual([]);
  });
});
