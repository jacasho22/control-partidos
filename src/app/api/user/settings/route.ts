import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { homeCity: true, pricePerKm: true }
    });
    return NextResponse.json(user);
  } catch (err) {
    console.error('Error GET settings:', err);
    return NextResponse.json({ message: 'Error al obtener ajustes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { homeCity, pricePerKm } = await req.json();
    await prisma.user.update({
      where: { id: (session.user as any).id },
      data: { 
        homeCity: homeCity?.trim() || null, 
        pricePerKm: parseFloat(pricePerKm) || 0.23 
      }
    });
    return NextResponse.json({ message: 'Ajustes actualizados correctamente' });
  } catch (err) {
    console.error('Error POST settings:', err);
    return NextResponse.json({ message: 'Error al actualizar ajustes' }, { status: 500 });
  }
}
