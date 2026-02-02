import { PrismaClient } from '@prisma/client';
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const rawUrl = process.env.DATABASE_URL;
if (rawUrl) {
  let cleaned = rawUrl.trim();
  // Remove any surrounding quotes (single or double)
  cleaned = cleaned.replace(/^["']|["']$/g, '');
  // Aggressive trim
  cleaned = cleaned.trim();
  // Remove 'psql ' prefix if present
  cleaned = cleaned.replace(/^psql\s+/i, '');
  // Remove any non-ASCII characters or control characters that shouldn't be in a URL
  cleaned = cleaned.replace(/[^\x20-\x7E]/g, '');
  
  process.env.DATABASE_URL = cleaned;
  console.log('Cleaned DATABASE_URL length:', cleaned.length);
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
