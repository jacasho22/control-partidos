
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const matches = await prisma.match.findMany({
      include: {
        category: true,
        division: true,
      },
      take: 20,
    });

    console.log('--- DATA START ---');
    matches.forEach(m => {
      console.log(`ID: ${m.id}`);
      console.log(`Category Name: '${m.category.name}'`);
      console.log(`Division Name: '${m.division.name}'`);
      console.log(`Combined would be: '${m.category.name} ${m.division.name}'`);
      console.log('---');
    });
    console.log('--- DATA END ---');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
