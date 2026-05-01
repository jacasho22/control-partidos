
const { extractEquipmentColors } = require('./src/lib/pdfParser');
const fs = require('fs');

async function test() {
  const text = fs.readFileSync('debug_pdf_text.txt', 'utf8');
  const summaryBlocks = text.split(/DATOS DEL PARTIDO\s+/).slice(1);
  
  console.log(`--- Test de Extracción de Colores (Nueva Lógica) ---`);
  
  summaryBlocks.forEach((block, index) => {
    const numMatch = block.match(/^(\d+)/);
    const matchId = numMatch ? numMatch[1] : `Bloque ${index + 1}`;
    
    const colors = extractEquipmentColors(block);
    console.log(`Partido ${matchId}:`);
    console.log(`  Local:   ${colors.localColor || 'No detectado'}`);
    console.log(`  Visitante: ${colors.visitorColor || 'No detectado'}`);
    console.log('---');
  });
}

test();
