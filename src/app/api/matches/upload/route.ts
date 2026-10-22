import { NextResponse } from 'next/server';
import { parseDesignationPdf } from '@/lib/pdfParser';

export async function POST(req: Request) {
  console.log('--- Nueva solicitud de subida de PDF(s) recibida ---');
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No se han subido archivos' }, { status: 400 });
    }

    console.log(`Procesando ${files.length} archivo(s)...`);

    // pdf-parse/pdfjs-dist usan estado global (configuración del worker, módulos
    // cacheados) que no es seguro entre invocaciones concurrentes: procesar varios
    // PDFs a la vez con Promise.all provocaba fallos intermitentes de "Invalid PDF
    // structure" en algunos de ellos (el mismo archivo funcionaba bien si se subía
    // solo). Se procesan uno a uno para evitar la condición de carrera.
    const allMatchesArrays = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const buffer = Buffer.from(await file.arrayBuffer());
      console.log(`Procesando archivo ${index + 1}/${files.length}: ${file.name}`);
      try {
        const matches = await parseDesignationPdf(buffer);
        console.log(`Archivo ${file.name} procesado: ${matches.length} partido(s) encontrado(s)`);
        allMatchesArrays.push(matches);
      } catch (error) {
        const err = error as Error;
        console.error(`Error procesando ${file.name} (intento 1):`, err.stack || err.message);
        // El fallo observado en producción es intermitente (el mismo PDF a veces
        // falla y a veces no dentro del mismo proceso), así que reintentamos una
        // vez antes de darlo por perdido.
        try {
          const matches = await parseDesignationPdf(buffer);
          console.log(`Archivo ${file.name} procesado en el reintento: ${matches.length} partido(s) encontrado(s)`);
          allMatchesArrays.push(matches);
        } catch (retryError) {
          const retryErr = retryError as Error;
          console.error(`Error procesando ${file.name} (intento 2, definitivo):`, retryErr.stack || retryErr.message);
          allMatchesArrays.push([]);
        }
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
