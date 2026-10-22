// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseDesignationPdf } from './parseDesignationPdf';

const fixturesDir = path.join(__dirname, '..', '__tests__', 'fixtures');
const hasFixtures = fs.existsSync(fixturesDir);

describe.skipIf(!hasFixtures)('parseDesignationPdf (real PDFs)', () => {
  it('parses a single-match PDF with a swatch-only visitor color', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-18_T_94.pdf'));
    const matches = await parseDesignationPdf(buf);
    expect(matches).toHaveLength(1);
    const match = matches[0];
    expect(match.id).toBe('64342');
    expect(match.date).toBe('18/10/2026');
    expect(match.time).toBe('16:00');
    expect(match.localTeam).toBe('CB CASTELLON');
    expect(match.visitorTeam).toBe('CAIXA POPULAR C.B.C MANISES');
    expect(match.category).toContain('Junior Masculino');
    expect(match.localColor).toBe('NEGRO/NEGRO');
    expect(match.visitorColor).toBe('NARANJA'); // recuperado del cuadrado de color
    expect(match.partners.length).toBeGreaterThanOrEqual(4);
    const principal = match.partners.find((p) => p.role === 'ARBITRO PRINCIPAL');
    expect(principal?.name).toBe('ENRIQUE DOMINGUEZ MARTINEZ');
  });

  it('parses a single-match PDF with a swatch-only local color', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-17_T_326.pdf'));
    const matches = await parseDesignationPdf(buf);
    expect(matches).toHaveLength(1);
    const match = matches[0];
    expect(match.id).toBe('67066');
    expect(match.localColor).toBe('AMARILLO'); // recuperado del cuadrado de color
    expect(match.visitorColor).toBe('NEGRO/BLANCO');
  });

  it('parses a single-match PDF where both colors are plain text', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-17_M_240.pdf'));
    const matches = await parseDesignationPdf(buf);
    expect(matches).toHaveLength(1);
    const match = matches[0];
    expect(match.id).toBe('70825');
  });

  it('parses the same PDF reliably across repeated calls (no cross-call corruption)', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-18_T_94.pdf'));
    for (let i = 0; i < 5; i++) {
      const matches = await parseDesignationPdf(buf);
      expect(matches).toHaveLength(1);
      expect(matches[0].id).toBe('64342');
    }
  });

  it('parses three different PDFs back-to-back in the same process without losing any', async () => {
    const files = ['2026-10-18_T_94.pdf', '2026-10-17_T_326.pdf', '2026-10-17_M_240.pdf'];
    const expectedIds = ['64342', '67066', '70825'];
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < files.length; i++) {
        const buf = fs.readFileSync(path.join(fixturesDir, files[i]));
        const matches = await parseDesignationPdf(buf);
        expect(matches, `round ${round}, file ${files[i]}`).toHaveLength(1);
        expect(matches[0].id).toBe(expectedIds[i]);
      }
    }
  });
});
