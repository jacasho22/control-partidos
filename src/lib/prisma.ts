import { PrismaClient } from '@prisma/client';
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const rawUrl = process.env.DATABASE_URL;
if (rawUrl && /^['"].*['"]$/.test(rawUrl)) {
  process.env.DATABASE_URL = rawUrl.replace(/^['"]|['"]$/g, '');
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
