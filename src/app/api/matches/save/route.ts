import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAutomaticFee } from '@/lib/tariffService';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { matches } = await req.json();
    if (!matches || !Array.isArray(matches)) {
      return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 });
    }

    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ message: 'Error de autenticación' }, { status: 401 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const saved = [];
      for (const matchData of matches) {
        // 1. Categoría y División
        const catName = (matchData.category || 'Desconocida').trim();
        let category = await tx.category.findFirst({ where: { name: catName } });
        if (!category) {
          category = await tx.category.create({
            data: {
              name: catName,
              gender: catName.toLowerCase().includes('masc') ? 'MASCULINO' : 
                      catName.toLowerCase().includes('fem') ? 'FEMENINO' : 'MIXTO',
            },
          });
        }

        const divName = (matchData.division || 'Sin división').trim();
        let division = await tx.division.findFirst({
          where: { name: divName, categoryId: category.id },
        });
        if (!division) {
          division = await tx.division.create({
            data: { name: divName, level: 0, categoryId: category.id },
          });
        }

        if (!matchData.matchNumber || !matchData.date || !matchData.time || !matchData.localTeam || !matchData.visitorTeam || !matchData.role) {
          continue;
        }

        const dateParts = matchData.date.split('/');
        if (dateParts.length !== 3) continue;
        const [day, month, year] = dateParts;
        const dateObj = new Date(`${year}-${month}-${day}T00:00:00Z`);

        // 3. Upsert del partido con colores
        const match = await tx.match.upsert({
          where: {
            matchNumber_userId: {
              matchNumber: matchData.matchNumber,
              userId: userId,
            },
          },
          update: {
            date: dateObj,
            time: matchData.time,
            venue: matchData.venue,
            venueAddress: matchData.venueAddress,
            localTeam: matchData.localTeam,
            visitorTeam: matchData.visitorTeam,
            categoryId: category.id,
            divisionId: division.id,
            role: matchData.role,
            matchday: matchData.matchday,
            partners: matchData.partners,
            localColor: matchData.localColor,
            visitorColor: matchData.visitorColor,
            deletedAt: null,
          },
          create: {
            matchNumber: matchData.matchNumber,
            date: dateObj,
            time: matchData.time,
            venue: matchData.venue,
            venueAddress: matchData.venueAddress,
            localTeam: matchData.localTeam,
            visitorTeam: matchData.visitorTeam,
            categoryId: category.id,
            divisionId: division.id,
            role: matchData.role,
            matchday: matchData.matchday,
            partners: matchData.partners,
            localColor: matchData.localColor,
            visitorColor: matchData.visitorColor,
            userId: userId,
          },
        });

        // 4. Automatización del Importe (Pago)
        const autoFee = getAutomaticFee(catName, matchData.role);
        
        // Verificar si ya existe un pago con importe manual
        const existingPayment = await tx.payment.findUnique({
          where: { matchId: match.id }
        });

        if (!existingPayment) {
          // Crear pago inicial con tarifa automática
          await tx.payment.create({
            data: {
              matchId: match.id,
              userId: userId,
              matchPayment: autoFee,
              gasPayment: 0, // Gasolina siempre manual
            }
          });
        } else if (existingPayment.matchPayment === 0) {
          // Si existe pero el importe es 0, actualizamos con el automático
          await tx.payment.update({
            where: { matchId: match.id },
            data: { matchPayment: autoFee }
          });
        }

        saved.push(match);
      }
      return saved;
    });

    return NextResponse.json({ 
      message: `${result.length} partidos guardados correctamente con importes automatizados`,
      count: result.length 
    });
  } catch (error) {
    console.error('ERROR FATAL AL GUARDAR PARTIDOS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ 
      message: 'Error al procesar el guardado de partidos',
      error: errorMessage
    }, { status: 500 });
  }
}
