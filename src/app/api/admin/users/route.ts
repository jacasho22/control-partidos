import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { matches: true },
        },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
