import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAvailableSeasons, getCurrentSeasonLabel, isDateInSeason } from '@/lib/season';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const requestedSeason = request.nextUrl.searchParams.get('season');

  try {
    const allMatches = await prisma.match.findMany({
      where: { userId, deletedAt: null },
      include: {
        payment: true,
        category: true,
        division: true,
      },
      orderBy: { date: 'asc' },
    });

    // 1. Verificar si el usuario ha visto la última actualización
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastVersionSeen: true }
    });

    const CURRENT_VERSION = '1.2.0';
    const showUpdateModal = user?.lastVersionSeen !== CURRENT_VERSION;

    const currentSeason = getCurrentSeasonLabel();
    const availableSeasons = getAvailableSeasons(allMatches.map(m => m.date));
    const season = requestedSeason && availableSeasons.includes(requestedSeason) ? requestedSeason : currentSeason;

    if (allMatches.length === 0) {
      return NextResponse.json({
        nextMatch: null,
        recentMatches: [],
        weeklyEarnings: 0,
        totalEarnings: 0,
        topCategory: '-',
        totalMatches: 0,
        currentSeason,
        season,
        availableSeasons,
      });
    }

    const seasonMatches = allMatches.filter(m => isDateInSeason(m.date, season));

    const now = new Date();
    
    // Lógica para encontrar el próximo partido:
    // 1. Debe ser en el futuro (incluyendo hoy pero después de la hora de inicio)
    // 2. Debe ser dentro de la semana actual (hasta el domingo a las 23:59:59)
    interface MatchData {
      date: Date | string;
      time: string;
    }

    const getMatchDateTime = (m: MatchData) => {
      const d = new Date(m.date);
      const [hours, minutes] = m.time.split(':').map(Number);
      d.setUTCHours(hours, minutes, 0, 0);
      return d;
    };

    const nextMatchCandidate = allMatches
      .map(m => ({ ...m, fullDateTime: getMatchDateTime(m) }))
      .filter(m => m.fullDateTime >= now)
      .sort((a, b) => a.fullDateTime.getTime() - b.fullDateTime.getTime())[0];

    let nextMatch = null;
    if (nextMatchCandidate) {
      const endOfWeek = new Date(now);
      const day = now.getUTCDay(); // 0 (Dom) a 6 (Sáb)
      const daysUntilSunday = (7 - day) % 7;
      endOfWeek.setUTCDate(now.getUTCDate() + daysUntilSunday);
      endOfWeek.setUTCHours(23, 59, 59, 999);

      if (nextMatchCandidate.fullDateTime <= endOfWeek) {
        // Quitamos la propiedad temporal antes de enviarla
        const { fullDateTime: _unused, ...matchWithoutFullDate } = nextMatchCandidate;
        nextMatch = matchWithoutFullDate;
      }
    }
    
    // Sort descending for recent matches and earnings calculation
    const sortedMatchesDesc = [...allMatches].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const recentMatches = sortedMatchesDesc.slice(0, 3);
    
    // Calculate weekly earnings (since last Friday)
    const dayOfWeek = now.getUTCDay();
    const distFromFriday = (dayOfWeek + 2) % 7;
    const lastFriday = new Date(now);
    lastFriday.setUTCDate(now.getUTCDate() - distFromFriday);
    lastFriday.setUTCHours(0, 0, 0, 0);

    const weeklyEarnings = allMatches
      .filter(m => new Date(m.date) >= lastFriday)
      .reduce((sum, m) => sum + (m.payment?.matchPayment || 0) + (m.payment?.gasPayment || 0), 0);
    
    // Calculate total season earnings (filtered by selected season)
    const totalEarnings = seasonMatches
      .reduce((sum, m) => sum + (m.payment?.matchPayment || 0) + (m.payment?.gasPayment || 0), 0);

    // Calculate top category (within selected season)
    const categories: Record<string, number> = {};
    seasonMatches.forEach(m => {
      categories[m.category.name] = (categories[m.category.name] || 0) + 1;
    });

    let topCategory = '-';
    let maxCount = 0;
    Object.entries(categories).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCategory = name;
      }
    });

    return NextResponse.json({
      nextMatch,
      recentMatches,
      weeklyEarnings,
      totalEarnings,
      topCategory,
      totalMatches: seasonMatches.length,
      showUpdateModal,
      currentVersion: CURRENT_VERSION,
      currentSeason,
      season,
      availableSeasons,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ message: 'Error al cargar datos del dashboard' }, { status: 500 });
  }
}
