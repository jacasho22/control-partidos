import { prisma } from './app/src/lib/prisma';

async function cleanPartnerNames() {
  const matches = await prisma.match.findMany({
    where: { partners: { not: null } }
  });

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
        console.log(`Partido ${match.matchNumber} actualizado.`);
      }
    }
  }
}

cleanPartnerNames().then(() => console.log('Limpieza completada.'));
