
const { extractEquipmentColors } = require('./src/lib/pdfParser');

const testCases = [
  {
    name: "Caso Crítico 1: EDM ORIHUELA AZUL",
    block: `
DATOS DEL PARTIDO 38162
CATEGORÍACOMPETICIÓN
Cadete Masculino IR Nivel 2ª ZonalFase Regular - Gr X
DATOS EQUIPOS
LOCALCAMISETAPANTALÓN
EDM ORIHUELA AZUL AMARILLO/BLANCO AMARILLO/BLANCO
VISITANTECAMISETAPANTALÓN
CB RAFAL CADETE AZUL CLARO /BLANCO NEGRO/BLANCO
EQUIPO ARBITRAL
`,
    expectedLocal: "AMARILLO / BLANCO",
    expectedVisitor: "AZUL CLARO / BLANCO"
  },
  {
    name: "Caso 2: Formato Multilínea (Fundación)",
    block: `
DATOS EQUIPOS
LOCALCAMISETAPANTALÓN
FUNDACIÓN JOSE SERNA-C.B. 
ORIBASKET
VERDE CLARO
/BLANCO
VERDE CLARO
/BLANCO
VISITANTECAMISETAPANTALÓN
CB TORREVIEJA INF. FEM.AZUL OSCURO
/BLANCO
AZUL OSCURO
/AZUL CLARO
EQUIPO ARBITRAL
`,
    expectedLocal: "VERDE CLARO / BLANCO",
    expectedVisitor: "AZUL OSCURO / BLANCO"
  },
  {
    name: "Caso 3: Formato Pegado (Big Ben)",
    block: `
DATOS EQUIPOS
LOCALCAMISETAPANTALÓN
BIG BEN CAFÉ-C.B. ORIBASKETVERDE CLARO
/BLANCO
VERDE CLARO
/BLANCO
VISITANTECAMISETAPANTALÓN
CB TORREVIEJA CAD. FEM.AZUL OSCURO
/BLANCO
AZUL OSCURO
/AZUL CLARO
`,
    expectedLocal: "VERDE CLARO / BLANCO",
    expectedVisitor: "AZUL OSCURO / BLANCO"
  }
];

function runTests() {
  console.log("=== PRUEBAS DE EXTRACCIÓN DE COLORES (LOCAL) ===\n");
  let passedCount = 0;

  testCases.forEach((tc, i) => {
    const result = extractEquipmentColors(tc.block);
    const localPass = result.localColor === tc.expectedLocal;
    const visitorPass = result.visitorColor === tc.expectedVisitor;

    console.log(`Test ${i + 1}: ${tc.name}`);
    console.log(`  Local:     [${result.localColor}] ${localPass ? '✅' : '❌ (Esperado: ' + tc.expectedLocal + ')'}`);
    console.log(`  Visitante: [${result.visitorColor}] ${visitorPass ? '✅' : '❌ (Esperado: ' + tc.expectedVisitor + ')'}`);
    console.log("");

    if (localPass && visitorPass) passedCount++;
  });

  console.log(`Resultado final: ${passedCount}/${testCases.length} tests pasados.`);
  if (passedCount !== testCases.length) {
    process.exit(1);
  }
}

runTests();
