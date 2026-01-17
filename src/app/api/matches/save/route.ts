import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  console.log('Save Route - Session object:', JSON.stringify(session, null, 2));
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { matches } = await req.json();
    console.log('--- Iniciando guardado de partidos ---');
    console.log(`Recibidos ${matches?.length} partidos para guardar`);

    if (!matches || !Array.isArray(matches)) {
      return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 });
    }

    const userId = (session.user as any).id;
    console.log(`Guardando para usuario ID: ${userId}`);
    const savedMatches = [];

    for (const matchData of matches) {
      console.log('Procesando partido individual:', JSON.stringify(matchData, null, 2));
      // 1. Encontrar o crear categoría
      const catName = matchData.category.trim();
      let category = await prisma.category.findFirst({
        where: { name: catName },
      });

      if (!category) {
        console.log(`Categoría no encontrada: "${catName}". Creando...`);
        category = await prisma.category.create({
          data: {
            name: catName,
            gender: catName.toLowerCase().includes('masc') ? 'MASCULINO' : 
                    catName.toLowerCase().includes('fem') ? 'FEMENINO' : 'MIXTO',
          },
        });
      }

      // 2. Encontrar o crear división
      const divName = matchData.division.trim();
      let division = await prisma.division.findFirst({
        where: {
          name: divName,
          categoryId: category.id,
        },
      });

      if (!division) {
        console.log(`División no encontrada: "${divName}" para categoría ${catName}. Creando...`);
        division = await prisma.division.create({
          data: {
            name: divName,
            level: 0,
            categoryId: category.id,
          },
        });
      }

      // Validar datos mínimos obligatorios para el modelo Match
      if (!matchData.matchNumber || !matchData.date || !matchData.time || !matchData.localTeam || !matchData.visitorTeam || !matchData.role) {
        console.warn('Faltan campos obligatorios en el partido:', matchData.matchNumber, {
          matchNumber: !!matchData.matchNumber,
          date: !!matchData.date,
          time: !!matchData.time,
          localTeam: !!matchData.localTeam,
          visitorTeam: !!matchData.visitorTeam,
          role: !!matchData.role
        });
        continue;
      }

      // Parsear fecha DD/MM/YYYY a objeto Date
      const dateParts = matchData.date.split('/');
      if (dateParts.length !== 3) {
        console.warn(`Formato de fecha inválido para el partido ${matchData.matchNumber}: ${matchData.date}`);
        continue;
      }
      const [day, month, year] = dateParts;
      const dateObj = new Date(`${year}-${month}-${day}T00:00:00Z`);

      if (isNaN(dateObj.getTime())) {
        console.warn(`Fecha inválida generada para el partido ${matchData.matchNumber}: ${matchData.date}`);
        continue;
      }

      // 3. Upsert del partido
      const match = await prisma.match.upsert({
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
          userId: userId,
        },
      });

      savedMatches.push(match);
    }

    return NextResponse.json({ 
      message: `${savedMatches.length} partidos guardados correctamente`,
      count: savedMatches.length 
    });
  } catch (error: any) {
    console.error('Error detallado al guardar partidos:', error);
    if (error.code) console.error('Código de error Prisma:', error.code);
    if (error.meta) console.error('Meta del error Prisma:', error.meta);
    
    return NextResponse.json({ 
      message: 'Error al guardar los partidos',
      error: error.message,
      code: error.code
    }, { status: 500 });
  }
}
