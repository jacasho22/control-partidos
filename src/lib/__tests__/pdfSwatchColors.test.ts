import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { extractSwatchColors } from '../pdfSwatchColors';

const fixturesDir = path.join(__dirname, 'fixtures');
// Los PDFs reales no están en el repo (datos personales de terceros, ver .gitignore).
// Solo corren localmente si el desarrollador los coloca en fixtures/; en CI se saltan.
const hasFixtures = fs.existsSync(fixturesDir);

describe.skipIf(!hasFixtures)('pdfSwatchColors', () => {
  it('extracts the swatch color for a team with no color text (visitante CAIXA POPULAR)', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-18_T_94.pdf'));
    const result = await extractSwatchColors(buf);
    expect(result['64342']).toBeDefined();
    expect(result['64342'].visitorColor).toBe('NARANJA');
    expect(result['64342'].localColor).toBeUndefined();
  });

  it('extracts the swatch color for a team with no color text (local IDA VALENCIA)', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-17_T_326.pdf'));
    const result = await extractSwatchColors(buf);
    expect(result['67066']).toBeDefined();
    expect(result['67066'].localColor).toBe('AMARILLO');
    expect(result['67066'].visitorColor).toBeUndefined();
  });

  it('does not report a swatch when the color is already plain text', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-17_M_240.pdf'));
    const result = await extractSwatchColors(buf);
    expect(result['70825']).toBeUndefined();
  });
});
