import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface SessionUser {
  id: string;
  role: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  
  if (!session || user?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
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
  const user = session?.user as SessionUser | undefined;

  if (!session || user?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ message: 'ID requerido' }, { status: 400 });
    }

    // Prevent deleting yourself
    if (id === user?.id) {
        return NextResponse.json({ message: 'No puedes borrar tu propia cuenta' }, { status: 400 });
    }

    // Soft delete: no borramos de verdad para no perder el histórico
    await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() }
    });
    
    return NextResponse.json({ message: 'Usuario eliminado' });
  } catch (err) {
    return NextResponse.json({ message: 'Error al eliminar usuario' }, { status: 500 });
  }
}
