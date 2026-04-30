export type RoleType = 'ARBITRO' | 'ACTA' | 'CRONO' | '24"';

interface TariffData {
  [category: string]: {
    [role in RoleType]?: number;
  };
}

const TARIFFS: TariffData = {
  // Senior Masc
  'SENIOR MASC. 1ª DIV.': { 'ARBITRO': 80.50, 'ACTA': 23.00, 'CRONO': 23.00, '24"': 23.00 },
  'SENIOR MASC. AUTONÓMICO': { 'ARBITRO': 50.75, 'ACTA': 18.75, 'CRONO': 18.75, '24"': 18.75 },
  'SENIOR MASC. PREFERENTE': { 'ARBITRO': 34.00, 'ACTA': 17.60, 'CRONO': 17.60 },
  'SENIOR MASC. 1ª ZONAL': { 'ARBITRO': 30.00, 'ACTA': 15.60, 'CRONO': 15.60 },
  'SENIOR MASC. 2ª ZONAL': { 'ARBITRO': 28.00, 'ACTA': 15.60, 'CRONO': 15.60 },
  
  // Junior Masc
  'JUNIOR MASC. NIVEL AUTONÓMICO': { 'ARBITRO': 30.50, 'ACTA': 17.60, 'CRONO': 17.60, '24"': 17.60 },
  'JUNIOR MASC. PREFERENTE': { 'ARBITRO': 26.50, 'ACTA': 15.60, 'CRONO': 15.60 },
  'JUNIOR MASC. 1ª ZONAL': { 'ARBITRO': 24.50, 'ACTA': 15.60, 'CRONO': 15.60 },

  // Senior Fem
  'SENIOR FEM. 1ª DIVISIÓN': { 'ARBITRO': 50.75, 'ACTA': 18.75, 'CRONO': 18.75, '24"': 18.75 },
  'SENIOR FEM. AUTONÓMICO': { 'ARBITRO': 30.00, 'ACTA': 15.60, 'CRONO': 15.60, '24"': 15.60 },
  'SENIOR FEM. PREFERENTE': { 'ARBITRO': 28.00, 'ACTA': 15.60, 'CRONO': 15.60 },

  // Junior Fem
  'JUNIOR FEM. NIVEL AUTONÓMICO': { 'ARBITRO': 30.50, 'ACTA': 17.60, 'CRONO': 17.60, '24"': 17.60 },
  'JUNIOR FEM. NIVEL PREFERENTE': { 'ARBITRO': 26.50, 'ACTA': 15.60, 'CRONO': 15.60 },
  'JUNIOR FEM. NIVEL 1ª ZONAL': { 'ARBITRO': 24.50, 'ACTA': 15.60, 'CRONO': 15.60 },
  'JUNIOR FEM. CTO AUTONÓMICO': { 'ARBITRO': 30.50, 'ACTA': 17.60, 'CRONO': 17.60, '24"': 17.60 },
  'JUNIOR FEM. CTO PREFERENTE': { 'ARBITRO': 26.50, 'ACTA': 15.60, 'CRONO': 15.60 },
  'JUNIOR FEM. CTO 1ª ZONAL': { 'ARBITRO': 24.50, 'ACTA': 15.60, 'CRONO': 15.60 },

  // Otras Categorías (FEB/Ligas)
  'PRIMERA FEB': { 'ACTA': 54.00, 'CRONO': 54.00, '24"': 54.00 },
  'SEGUNDA FEB': { 'ACTA': 48.00, 'CRONO': 48.00, '24"': 48.00 },
  'TERCERA FEB': { 'ACTA': 29.12, 'CRONO': 29.12, '24"': 29.12 },
  'LIGA FEMENINA': { 'ACTA': 48.00, 'CRONO': 48.00, '24"': 48.00 },
  'LIGA FEMENINA CHALLENGE': { 'ACTA': 48.00, 'CRONO': 48.00, '24"': 48.00 },
  'LIGA FEMENINA - 2': { 'ACTA': 31.20, 'CRONO': 31.20, '24"': 31.20 },
};

const DEFAULT_FEE = 17.25;

export function getAutomaticFee(category: string, role: string): number {
  const normCategory = category.toUpperCase().trim();
  const normRole = mapRoleToType(role);
  
  console.log(`Calculando tarifa para: [${normCategory}] con rol [${normRole}]`);

  // Búsqueda por coincidencia exacta o contenida
  for (const [catKey, fees] of Object.entries(TARIFFS)) {
    if (normCategory.includes(catKey) || catKey.includes(normCategory)) {
      const fee = fees[normRole];
      if (fee !== undefined) return fee;
    }
  }

  // Fallback por palabras clave si falla lo anterior
  if (normCategory.includes('INFANTIL') || normCategory.includes('ALEVÍN') || normCategory.includes('BENJAMÍN')) {
    // Para categorías de formación que no están en la tabla explícita
    if (normRole === 'ARBITRO') return 20.00; // Un valor razonable para formación si no hay tabla
    return 15.00; 
  }

  console.log(`No se encontró tarifa para ${category}. Aplicando fallback de ${DEFAULT_FEE}`);
  return DEFAULT_FEE;
}

function mapRoleToType(role: string): RoleType {
  const r = role.toUpperCase();
  if (r.includes('ARBITRO')) return 'ARBITRO';
  if (r.includes('ANOTADOR') || r.includes('ACTA')) return 'ACTA';
  if (r.includes('CRONO')) return 'CRONO';
  if (r.includes('24')) return '24"';
  return 'ARBITRO';
}
