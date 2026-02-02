import { PrismaClient } from '@prisma/client';
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const rawUrl = process.env.DATABASE_URL;
if (rawUrl) {
  let cleaned = rawUrl.trim();
  // Remove any surrounding quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/^psql\s+/i, '');
  cleaned = cleaned.replace(/\u2026/g, '');
  process.env.DATABASE_URL = cleaned;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
