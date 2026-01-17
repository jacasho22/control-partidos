import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { matchId, matchPayment, gasPayment } = await req.json();

    if (!matchId) {
      return NextResponse.json({ message: 'Falta matchId' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Verificar que el partido pertenece al usuario
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match || match.userId !== userId) {
      return NextResponse.json({ message: 'Partido no encontrado o no pertenece al usuario' }, { status: 404 });
    }

    const payment = await prisma.payment.upsert({
      where: { matchId },
      update: {
        matchPayment,
        gasPayment,
        paidAt: new Date(), // Opcional: registrar fecha de pago
      },
      create: {
        matchId,
        userId,
        matchPayment,
        gasPayment,
        paidAt: new Date(),
      },
    });

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json({ message: 'Error interno al guardar el pago' }, { status: 500 });
  }
}
