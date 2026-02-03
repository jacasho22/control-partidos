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
      where: {}
    });

    const knownRoles = [
      'ARBITRO PRINCIPAL',
      'ARBITRO AUXILIAR',
      'ANOTADOR',
      'CRONOMETRADOR',
      'OPERADOR 24"',
      'OPERADOR 24',
      'COORDINADOR'
    ];

    let updatedCount = 0;
    for (const match of matches) {
      if (!match.partners) continue;
      const partners = match.partners as any[];
      if (Array.isArray(partners)) {
        let changed = false;
        const cleanedPartners = partners.map(p => {
          const name = p.name || '';
          let role = p.role || 'ARBITRO';

          // Limpieza agresiva del nombre
          let newName = name.trim().replace(/\s+/g, ' ');

          // Eliminar roles si están en el nombre
          for (const kr of knownRoles) {
            if (newName.toUpperCase().startsWith(kr)) {
              newName = newName.substring(kr.length).trim();
              role = kr; // Aprovechamos para corregir el rol si estaba mal
              break;
            }
          }

          if (newName !== name || role !== p.role) {
            changed = true;
            return { ...p, name: newName, role };
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
  } catch (err) {
    console.error('Error en limpieza:', err);
    return NextResponse.json({ message: 'Error en la limpieza' }, { status: 500 });
  }
}
