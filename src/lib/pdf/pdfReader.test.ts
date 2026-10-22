// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { readPdf } from './pdfReader';

const fixturesDir = path.join(__dirname, '..', '__tests__', 'fixtures');
const hasFixtures = fs.existsSync(fixturesDir);

describe.skipIf(!hasFixtures)('readPdf', () => {
  it('reconstructs page text joining items on the same line without inserted spaces, newline on line change', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-18_T_94.pdf'));
    const { text } = await readPdf(buf);
    expect(text).toContain('DATOS DEL PARTIDO 64342');
    expect(text).toContain('CB CASTELLON NEGRO/NEGRO NEGRO/NEGRO');
  });

  it('joins pages with a blank line between them, like the previous pdf-parse output', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-18_T_94.pdf'));
    const { text } = await readPdf(buf);
    const pageOneEnd = text.indexOf('OBSERVACIONES');
    const pageTwoStart = text.indexOf('TELÉFONO DE CONTACTO');
    expect(pageOneEnd).toBeGreaterThan(-1);
    expect(pageTwoStart).toBeGreaterThan(pageOneEnd);
  });

  it('returns per-page structured text items with x/y positions, for swatch-color detection', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-18_T_94.pdf'));
    const { pages } = await readPdf(buf);
    expect(pages.length).toBeGreaterThan(0);
    const page3 = pages[2];
    expect(page3.texts.some((t) => t.str.includes('DATOS DEL PARTIDO'))).toBe(true);
    expect(page3.texts[0]).toHaveProperty('x');
    expect(page3.texts[0]).toHaveProperty('y');
  });

  it('returns filled-rectangle data per page, for swatch-color detection', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-18_T_94.pdf'));
    const { pages } = await readPdf(buf);
    // La página 3 de este PDF tiene un cuadrado de color (visitante sin color en texto)
    const page3 = pages[2];
    expect(page3.rects.length).toBeGreaterThan(0);
  });
});
