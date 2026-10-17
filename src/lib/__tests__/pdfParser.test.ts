import { describe, it, expect } from 'vitest';
import { extractEquipmentColors } from '../pdfParser';

describe('pdfParser - Color Extraction', () => {
  it('should extract simple colors correctly', () => {
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

  it('should extract dual colors with slash correctly', () => {
    const block = `
DATOS EQUIPOS
LOCAL CAMISETA PANTALÓN
FUNDACIÓN JOSE SERNA-C.B. VERDE CLARO VERDE CLARO
/BLANCO /BLANCO
VISITANTE CAMISETA PANTALÓN
CB TORREVIEJA INF. FEM. AZUL OSCURO AZUL OSCURO
/BLANCO /AZUL CLARO
    `;
    const colors = extractEquipmentColors(block);
    expect(colors.localColor).toBe('VERDE CLARO/BLANCO');
    expect(colors.visitorColor).toBe('AZUL OSCURO/BLANCO');
  });

  it('should handle missing sections gracefully', () => {
    const block = 'Texto sin información de colores';
    const colors = extractEquipmentColors(block);
    expect(colors.localColor).toBeUndefined();
    expect(colors.visitorColor).toBeUndefined();
  });

  it('should extract inline dual-tone colors on a single line (BLANCO/ROJO BLANCO/ROJO)', () => {
    const block = `
DATOS EQUIPOS
LOCAL CAMISETA PANTALÓN
ARROCES RIPOLL - OLIVICO CB ALTURA BLANCO/ROJO BLANCO/ROJO
VISITANTE CAMISETA PANTALÓN
REDI CB MONCOFA ROJO ROJO
    `;
    const colors = extractEquipmentColors(block);
    expect(colors.localColor).toBe('BLANCO/ROJO');
    expect(colors.visitorColor).toBe('ROJO');
  });

  it('should not bleed the pantalón column into an inline dual-tone shirt color (NEGRO/BLANCO NEGRO/BLANCO)', () => {
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

  it('should extract the same-hue dual-tone color correctly (NEGRO/NEGRO)', () => {
    const block = `
DATOS EQUIPOS
LOCAL CAMISETA PANTALÓN
CB CASTELLON NEGRO/NEGRO NEGRO/NEGRO
VISITANTE CAMISETA PANTALÓN
CAIXA POPULAR C.B.C MANISES
    `;
    const colors = extractEquipmentColors(block);
    expect(colors.localColor).toBe('NEGRO/NEGRO');
    expect(colors.visitorColor).toBeUndefined();
  });

  it('should combine a base color line with an accent line onto a two-line shirt+pants layout', () => {
    const block = `
DATOS EQUIPOS
LOCAL CAMISETA PANTALÓN
CB TORREBLANCA AZUL OSCURO
/AMARILLO
AZUL OSCURO
/AZUL OSCURO
VISITANTE CAMISETA PANTALÓN
CLUB BASQUET GIL COMES VINAROS ROSA ROSA
    `;
    const colors = extractEquipmentColors(block);
    expect(colors.localColor).toBe('AZUL OSCURO/AMARILLO');
    expect(colors.visitorColor).toBe('ROSA');
  });
});
