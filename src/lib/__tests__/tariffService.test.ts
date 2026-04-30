import { describe, it, expect } from 'vitest';
import { getAutomaticFee } from '../tariffService';

describe('TariffService', () => {
  it('should return correct fee for Senior Masc. 1ª Div. Referee', () => {
    const fee = getAutomaticFee('Senior Masc. 1ª Div.', 'ARBITRO PRINCIPAL');
    expect(fee).toBe(80.50);
  });

  it('should return correct fee for Junior Fem. Nivel Autonómico Acta', () => {
    const fee = getAutomaticFee('Junior Fem. NIVEL AUTONÓMICO', 'ANOTADOR');
    expect(fee).toBe(17.60);
  });

  it('should return fallback fee for unknown category', () => {
    const fee = getAutomaticFee('Categoría Inventada', 'ARBITRO');
    expect(fee).toBe(17.25);
  });

  it('should return formation fee for Infantil', () => {
    const fee = getAutomaticFee('Infantil Masculino IR', 'ARBITRO');
    expect(fee).toBe(20.00);
  });
});
