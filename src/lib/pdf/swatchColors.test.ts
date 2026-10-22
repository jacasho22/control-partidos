// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { readPdf } from './pdfReader';
import { findSwatchColors } from './swatchColors';

const fixturesDir = path.join(__dirname, '..', '__tests__', 'fixtures');
const hasFixtures = fs.existsSync(fixturesDir);

describe.skipIf(!hasFixtures)('findSwatchColors', () => {
  it('extracts the swatch color for a team with no color text (visitante sin texto)', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-18_T_94.pdf'));
    const { pages } = await readPdf(buf);
    const result = findSwatchColors(pages);
    expect(result['64342']).toBeDefined();
    expect(result['64342'].visitorColor).toBe('NARANJA');
    expect(result['64342'].localColor).toBeUndefined();
  });

  it('extracts the swatch color for a team with no color text (local sin texto)', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-17_T_326.pdf'));
    const { pages } = await readPdf(buf);
    const result = findSwatchColors(pages);
    expect(result['67066']).toBeDefined();
    expect(result['67066'].localColor).toBe('AMARILLO');
    expect(result['67066'].visitorColor).toBeUndefined();
  });

  it('does not report a swatch when the color is already plain text', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-17_M_240.pdf'));
    const { pages } = await readPdf(buf);
    const result = findSwatchColors(pages);
    expect(result['70825']).toBeUndefined();
  });
});
