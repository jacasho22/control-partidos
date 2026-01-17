import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
// No external date utility needed for these calculations


export async function GET(_req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  
  try {
    const matches = await prisma.match.findMany({
      where: { userId },
      include: {
        payment: true,
        category: true,
        division: true,
      },
      orderBy: { date: 'desc' },
    });

    const categories: Record<string, number> = {};
    const divisions: Record<string, number> = {};
    const detailedCategories: Record<string, number> = {};
    let totalMatch = 0;
    let totalGas = 0;

    const weeklyGroups: Record<string, { period: string; matches: number; fees: number; gas: number; total: number }> = {};
    const monthlyGroups: Record<string, { period: string; matches: number; fees: number; gas: number; total: number }> = {};

    matches.forEach(match => {
      const p = match.payment;
      const matchFee = p?.matchPayment || 0;
      const gasFee = p?.gasPayment || 0;
      
      totalMatch += matchFee;
      totalGas += gasFee;

      // Categorías
      const catName = match.category.name;
      categories[catName] = (categories[catName] || 0) + 1;

      // Divisiones (Ligas)
      const divName = match.division.name;
      divisions[divName] = (divisions[divName] || 0) + 1;

      // Categoría + División (Detallado)
      const detailedName = `${catName} - ${divName}`;
      detailedCategories[detailedName] = (detailedCategories[detailedName] || 0) + 1;

      // Agrupación Semanal (Viernes a Viernes)
      const date = new Date(match.date);
      const dayOfWeek = date.getUTCDay(); // Usar UTC para evitar problemas de zona horaria
      const distFromFriday = (dayOfWeek + 2) % 7;
      const friday = new Date(date);
      friday.setUTCDate(date.getUTCDate() - distFromFriday);
      const weekKey = friday.toISOString().split('T')[0]; // YYYY-MM-DD del Viernes

      if (!weeklyGroups[weekKey]) {
        weeklyGroups[weekKey] = { period: weekKey, matches: 0, fees: 0, gas: 0, total: 0 };
      }
      weeklyGroups[weekKey].matches++;
      weeklyGroups[weekKey].fees += matchFee;
      weeklyGroups[weekKey].gas += gasFee;
      weeklyGroups[weekKey].total += (matchFee + gasFee);

      // Agrupación Mensual
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!monthlyGroups[monthKey]) {
        monthlyGroups[monthKey] = { period: monthKey, matches: 0, fees: 0, gas: 0, total: 0 };
      }
      monthlyGroups[monthKey].matches++;
      monthlyGroups[monthKey].fees += matchFee;
      monthlyGroups[monthKey].gas += gasFee;
      monthlyGroups[monthKey].total += (matchFee + gasFee);
    });

    return NextResponse.json({
      totalMatch,
      totalGas,
      categories,
      divisions,
      detailedCategories,
      weekly: Object.values(weeklyGroups).sort((a, b) => b.period.localeCompare(a.period)),
      monthly: Object.values(monthlyGroups).sort((a, b) => b.period.localeCompare(a.period)),
    });
  } catch (error) {
    console.error('Error generating statistics:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ message }, { status: 500 });
  }
}
