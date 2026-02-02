import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const userId = (session.user as any).id;
    
    // Obtener todos los partidos del usuario
    const matches = await prisma.match.findMany({
      where: { 
        userId
      },
      select: {
        partners: true
      }
    });

    const partnerStats: Record<string, { count: number; phones: Set<string>; lastRole: string }> = {};

    matches.forEach(match => {
      if (!match.partners) return;
      const partnersList = match.partners as any[];
      if (Array.isArray(partnersList)) {
        partnersList.forEach(p => {
          // No contarse a sí mismo (basado en el nombre almacenado en la sesión si es posible)
          if (p.name && !p.name.includes(session.user?.name || '')) {
            if (!partnerStats[p.name]) {
              partnerStats[p.name] = { count: 0, phones: new Set(), lastRole: p.role };
            }
            partnerStats[p.name].count += 1;
            if (p.phone) partnerStats[p.name].phones.add(p.phone);
            partnerStats[p.name].lastRole = p.role;
          }
        });
      }
    });

    const result = Object.entries(partnerStats).map(([name, stats]) => ({
      name,
      count: stats.count,
      phone: Array.from(stats.phones)[0] || null, // Tomar el primer teléfono encontrado
      role: stats.lastRole
    })).sort((a, b) => b.count - a.count);

    return NextResponse.json({ partners: result });
  } catch (error) {
    console.error('Error fetching partner stats:', error);
    return NextResponse.json({ message: 'Error al obtener estadísticas de compañeros' }, { status: 500 });
  }
}
