// @vitest-environment node
// pdf-parse's bundled legacy pdfjs mis-detects jsdom's fake `document` as a real
// browser and breaks its worker setup ("No PDFJS.workerSrc specified"); the plain
// node environment avoids that entirely for this file.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseDesignationPdf } from '../pdfParser';

const fixturesDir = path.join(__dirname, 'fixtures');
// Los PDFs reales no están en el repo (datos personales de terceros, ver .gitignore).
// Solo corren localmente si el desarrollador los coloca en fixtures/; en CI se saltan.
const hasFixtures = fs.existsSync(fixturesDir);

describe.skipIf(!hasFixtures)('parseDesignationPdf - swatch color fallback (real PDFs, disabled)', () => {
  // El color por "cuadrado" (pdfjs-dist) se desactivó: corrompía el parseo de otros
  // PDFs en la misma instancia del servidor (ver nota en pdfParser.ts). Cuando el
  // color viene solo como cuadrado y no como texto, ahora queda sin definir.
  it('leaves visitorColor undefined when there is no color text (swatch disabled)', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-18_T_94.pdf'));
    const matches = await parseDesignationPdf(buf);
    const match = matches.find((m) => m.id === '64342');
    expect(match).toBeDefined();
    expect(match?.localColor).toBe('NEGRO/NEGRO');
    expect(match?.visitorColor).toBeUndefined();
  });

  it('leaves localColor undefined when there is no color text (swatch disabled)', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-17_T_326.pdf'));
    const matches = await parseDesignationPdf(buf);
    const match = matches.find((m) => m.id === '67066');
    expect(match).toBeDefined();
    expect(match?.localColor).toBeUndefined();
    expect(match?.visitorColor).toBe('NEGRO/BLANCO');
  });

  it('keeps using plain text colors when both are present (no swatch needed)', async () => {
    const buf = fs.readFileSync(path.join(fixturesDir, '2026-10-17_M_240.pdf'));
    const matches = await parseDesignationPdf(buf);
    const match = matches.find((m) => m.id === '70825');
    expect(match).toBeDefined();
    expect(match?.localColor).toBe('AZUL OSCURO/AMARILLO');
    expect(match?.visitorColor).toBe('ROSA');
  });
});
