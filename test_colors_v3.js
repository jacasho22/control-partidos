
const { extractEquipmentColors } = require('./src/lib/pdfParser');

const testBlock = `
DATOS DEL PARTIDO 38162
CATEGORÍACOMPETICIÓN
Cadete Masculino IR Nivel 2ª ZonalFase Regular - Gr X
DATOS EQUIPOS
LOCALCAMISETAPANTALÓN
EDM ORIHUELA AZUL
AMARILLO/BLANCO
AMARILLO/BLANCO
VISITANTECAMISETAPANTALÓN
CB RAFAL CADETE
AZUL CLARO
/BLANCO
NEGRO/BLANCO
EQUIPO ARBITRAL
`;

console.log("--- TEST CASO CRÍTICO (EDM ORIHUELA AZUL) ---");
const result = extractEquipmentColors(testBlock);
console.log("Local (Esperado: AMARILLO / BLANCO):", result.localColor);
console.log("Visitante (Esperado: AZUL CLARO / BLANCO):", result.visitorColor);
