import { NextResponse } from 'next/server';
import { parseDesignationPDF } from '@/lib/pdfParser';

export async function POST(req: Request) {
  console.log('--- Nueva solicitud de subida de PDF recibida ---');
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No se ha subido ningún archivo' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const matches = await parseDesignationPDF(buffer);

    return NextResponse.json({ matches });
  } catch (error: any) {
    console.error('Error processing PDF upload:', error);
    return NextResponse.json({ 
      message: 'Error al procesar el PDF', 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
