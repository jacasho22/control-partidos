
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const matches = await prisma.match.findMany({
      include: {
        payment: true
      }
    });
    console.log('Current Date:', new Date().toISOString());
    console.log('Matches found:', matches.length);
    matches.forEach(m => {
      console.log(`Match: ${m.matchNumber} | Date: ${m.date} | Payment: ${m.payment?.matchPayment} + ${m.payment?.gasPayment}`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
