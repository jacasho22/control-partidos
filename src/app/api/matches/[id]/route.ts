import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id: matchId } = await params;

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { id: matchId } = await params;

  try {
    const body = await req.json();
    const { venueAddress } = body;

    // Verificar que el partido pertenece al usuario
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ message: 'Partido no encontrado' }, { status: 404 });
    }

    if (match.userId !== userId) {
      return NextResponse.json({ message: 'No tienes permiso para editar este partido' }, { status: 403 });
    }

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        venueAddress: venueAddress !== undefined ? venueAddress : match.venueAddress,
        // También actualizamos venue si el usuario lo editó, para consistencia
        venue: venueAddress !== undefined ? venueAddress : match.venue
      },
    });

    return NextResponse.json({ message: 'Partido actualizado correctamente', match: updatedMatch });
  } catch (error) {
    console.error('Error updating match:', error);
    return NextResponse.json({ message: 'Error al actualizar el partido' }, { status: 500 });
  }
}
