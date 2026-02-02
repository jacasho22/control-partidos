import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const matches = await prisma.match.findMany({
      where: { partners: { not: null } }
    });

    let updatedCount = 0;
    for (const match of matches) {
      let partners = match.partners as any[];
      if (Array.isArray(partners)) {
        let changed = false;
        const cleanedPartners = partners.map(p => {
          const newName = p.name?.trim().replace(/\s+/g, ' ');
          if (newName !== p.name) {
            changed = true;
            return { ...p, name: newName };
          }
          return p;
        });

        if (changed) {
          await prisma.match.update({
            where: { id: match.id },
            data: { partners: cleanedPartners }
          });
          updatedCount++;
        }
      }
    }

    return NextResponse.json({ message: `Limpieza completada. ${updatedCount} partidos actualizados.` });
  } catch (error) {
    return NextResponse.json({ message: 'Error en la limpieza' }, { status: 500 });
  }
}
