import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  try {
    const { version } = await req.json();
    if (!version) return NextResponse.json({ message: 'Versión requerida' }, { status: 400 });

    await prisma.user.update({
      where: { id: userId },
      data: { lastVersionSeen: version }
    });

    return NextResponse.json({ message: 'Versión marcada como vista' });
  } catch (error) {
    console.error('Error actualizando versión vista:', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
