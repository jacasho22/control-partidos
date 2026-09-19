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
});
