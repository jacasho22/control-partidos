import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const matchId = params.id;

  try {
    // Verificar que el partido pertenece al usuario
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ message: 'Partido no encontrado' }, { status: 404 });
    }

    if (match.userId !== userId) {
      return NextResponse.json({ message: 'No tienes permiso para borrar este partido' }, { status: 403 });
    }

    // El pago se borrará automáticamente si configuramos onDelete: Cascade en el esquema
    // pero para estar seguros y evitar problemas con SQLite, borramos el pago primero si existe.
    await prisma.payment.deleteMany({
      where: { matchId: matchId },
    });

    await prisma.match.delete({
      where: { id: matchId },
    });

    return NextResponse.json({ message: 'Partido eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting match:', error);
    return NextResponse.json({ message: 'Error al eliminar el partido' }, { status: 500 });
  }
}
