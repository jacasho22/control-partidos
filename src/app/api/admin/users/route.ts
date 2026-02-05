import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        licenseNumber: true,
        name: true,
        role: true,
        refereeType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json({ message: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ message: 'ID requerido' }, { status: 400 });
    }

    // Prevent deleting yourself
    if (id === (session.user as any).id) {
        return NextResponse.json({ message: 'No puedes borrar tu propia cuenta' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    
    return NextResponse.json({ message: 'Usuario eliminado' });
  } catch (err) {
    return NextResponse.json({ message: 'Error al eliminar usuario' }, { status: 500 });
  }
}
