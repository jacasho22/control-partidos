import { NextResponse } from 'next/server';
import { parseDesignationPDF } from '@/lib/pdfParser';

export async function POST(req: Request) {
  console.log('--- Nueva solicitud de subida de PDF(s) recibida ---');
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No se han subido archivos' }, { status: 400 });
    }

    console.log(`Procesando ${files.length} archivo(s)...`);

    // Procesar todos los PDFs en paralelo
    const matchesPromises = files.map(async (file, index) => {
      try {
        console.log(`Procesando archivo ${index + 1}/${files.length}: ${file.name}`);
        const buffer = Buffer.from(await file.arrayBuffer());
        const matches = await parseDesignationPDF(buffer);
        console.log(`Archivo ${file.name} procesado: ${matches.length} partido(s) encontrado(s)`);
        return matches;
      } catch (error: any) {
        console.error(`Error procesando ${file.name}:`, error.message);
        // Retornar array vacío si un archivo falla, para no interrumpir el proceso
        return [];
      }
    });

    const allMatchesArrays = await Promise.all(matchesPromises);
    // Combinar todos los arrays de matches en uno solo
    const allMatches = allMatchesArrays.flat();

    console.log(`Total de partidos encontrados: ${allMatches.length}`);

    return NextResponse.json({ matches: allMatches });
  } catch (error: any) {
    console.error('Error processing PDF upload:', error);
    return NextResponse.json({ 
      message: 'Error al procesar los PDFs', 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
