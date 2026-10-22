import { describe, it, expect } from 'vitest';
import { extractEquipmentColors } from './colors';

// pdfjs-dist reconstruye el texto con espacios correctos entre palabras (a diferencia
// de la librería anterior, que a veces pegaba columnas sin espacio). Estos bloques
// reflejan el formato real que entrega src/lib/pdf/pdfReader.ts.
describe('extractEquipmentColors', () => {
  it('extracts simple colors correctly', () => {
    const block = `
DATOS EQUIPOS
LOCAL CAMISETA PANTALÓN
FUNDACIÓN JOSE SERNA-C.B. VERDE CLARO VERDE CLARO
VISITANTE CAMISETA PANTALÓN
CB TORREVIEJA INF. FEM. AZUL OSCURO AZUL OSCURO
    `;
    const colors = extractEquipmentColors(block);
    expect(colors.localColor).toBe('VERDE CLARO');
    expect(colors.visitorColor).toBe('AZUL OSCURO');
  });

  it('extracts dual colors with slash correctly', () => {
    const block = `
DATOS EQUIPOS
LOCAL CAMISETA PANTALÓN
CB CASTELLON NEGRO/NEGRO NEGRO/NEGRO
VISITANTE CAMISETA PANTALÓN
BASQUET CLUB PEÑISCOLA FACSA NEGRO/BLANCO NEGRO/BLANCO
    `;
    const colors = extractEquipmentColors(block);
    expect(colors.localColor).toBe('NEGRO/NEGRO');
    expect(colors.visitorColor).toBe('NEGRO/BLANCO');
  });

  it('handles missing sections gracefully', () => {
    const colors = extractEquipmentColors('Texto sin información de colores');
    expect(colors.localColor).toBeUndefined();
    expect(colors.visitorColor).toBeUndefined();
  });

  it('leaves a color undefined when the team has no color text (drawn as a square instead)', () => {
    const block = `
DATOS EQUIPOS
LOCAL CAMISETA PANTALÓN
CB CASTELLON NEGRO/NEGRO NEGRO/NEGRO
VISITANTE CAMISETA PANTALÓN
CAIXA POPULAR C.B.C MANISES
EQUIPO ARBITRAL
    `;
    const colors = extractEquipmentColors(block);
    expect(colors.localColor).toBe('NEGRO/NEGRO');
    expect(colors.visitorColor).toBeUndefined();
  });

  it('extracts a two-word modifier color (AZUL OSCURO) without bleeding into the next column', () => {
    const block = `
DATOS EQUIPOS
LOCAL CAMISETA PANTALÓN
IDA VALENCIA UIXÓ BÀSQUET
VISITANTE CAMISETA PANTALÓN
BASQUET CLUB PEÑISCOLA FACSA NEGRO/BLANCO NEGRO/BLANCO
    `;
    const colors = extractEquipmentColors(block);
    expect(colors.localColor).toBeUndefined();
    expect(colors.visitorColor).toBe('NEGRO/BLANCO');
  });
});
