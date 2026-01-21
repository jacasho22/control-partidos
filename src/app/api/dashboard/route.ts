import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  try {
    const allMatches = await prisma.match.findMany({
      where: { userId },
      include: {
        payment: true,
        category: true,
        division: true,
      },
      orderBy: { date: 'asc' },
    });

    if (allMatches.length === 0) {
      return NextResponse.json({
        nextMatch: null,
        recentMatches: [],
        weeklyEarnings: 0,
        totalEarnings: 0,
        topCategory: '-',
        totalMatches: 0,
      });
    }

    const now = new Date();
    const nextMatch = allMatches.find(m => new Date(m.date) >= now);
    
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
    
    // Calculate total season earnings
    const totalEarnings = allMatches
      .reduce((sum, m) => sum + (m.payment?.matchPayment || 0) + (m.payment?.gasPayment || 0), 0);

    // Calculate top category
    const categories: Record<string, number> = {};
    allMatches.forEach(m => {
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
      totalMatches: allMatches.length,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ message: 'Error al cargar datos del dashboard' }, { status: 500 });
  }
}
