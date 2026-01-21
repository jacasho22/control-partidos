import { PrismaClient } from '@prisma/client';
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const rawUrl = process.env.DATABASE_URL;
if (rawUrl && /^['"].*['"]$/.test(rawUrl)) {
  process.env.DATABASE_URL = rawUrl.replace(/^['"]|['"]$/g, '');
}
// Trim, remove accidental 'psql ' prefix and Unicode ellipsis (…)
if (process.env.DATABASE_URL) {
  let cleaned = process.env.DATABASE_URL.trim();
  cleaned = cleaned.replace(/^psql\s+/i, '');
  cleaned = cleaned.replace(/\u2026/g, '');
  process.env.DATABASE_URL = cleaned;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
