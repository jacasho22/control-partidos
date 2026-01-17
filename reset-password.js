const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function reset() {
  const licenseNumber = '31781';
  const newPassword = 'password123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  try {
    const user = await prisma.user.update({
      where: { licenseNumber },
      data: { password: hashedPassword }
    });
    console.log(`Password reset successfully for user: ${user.name} (License: ${licenseNumber})`);
    console.log(`New password: ${newPassword}`);
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
