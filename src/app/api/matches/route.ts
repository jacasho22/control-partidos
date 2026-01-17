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
    const userId = (session.user as any).id;
    const matches = await prisma.match.findMany({
      where: { userId },
      include: {
        category: true,
        division: true,
        payment: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ message: 'Error al obtener los partidos' }, { status: 500 });
  }
}
