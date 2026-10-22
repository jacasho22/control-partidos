import { NextResponse } from 'next/server';
import { parseDesignationPdf } from '@/lib/pdf/parseDesignationPdf';

export async function POST(req: Request) {
  console.log('--- Nueva solicitud de subida de PDF(s) recibida ---');
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No se han subido archivos' }, { status: 400 });
    }

    console.log(`Procesando ${files.length} archivo(s)...`);

    // Un PDF por iteración (no Promise.all): más fácil de leer en los logs y evita
    // cualquier posible interferencia de recursos entre documentos que se procesen
    // exactamente a la vez en la misma instancia del servidor.
    const allMatchesArrays = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      console.log(`Procesando archivo ${index + 1}/${files.length}: ${file.name}`);
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const matches = await parseDesignationPdf(buffer);
        console.log(`Archivo ${file.name} procesado: ${matches.length} partido(s) encontrado(s)`);
        allMatchesArrays.push(matches);
      } catch (error) {
        const err = error as Error;
        console.error(`Error procesando ${file.name}:`, err.stack || err.message);
        // Retornar array vacío si un archivo falla, para no interrumpir el proceso
        allMatchesArrays.push([]);
      }
    }
    // Combinar todos los arrays de matches en uno solo
    const allMatches = allMatchesArrays.flat();

    console.log(`Total de partidos encontrados: ${allMatches.length}`);

    return NextResponse.json({ matches: allMatches });
  } catch (error) {
    const err = error as Error;
    console.error('Error processing PDF upload:', err);
    return NextResponse.json({
      message: 'Error al procesar los PDFs',
      error: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
