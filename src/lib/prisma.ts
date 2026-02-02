import { PrismaClient } from '@prisma/client';
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const rawUrl = process.env.DATABASE_URL;
if (rawUrl) {
  let cleaned = rawUrl.trim();
  
  // Recursivamente quitar comillas dobles o simples que puedan estar anidadas
  while ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  
  // Eliminar prefijo 'psql ' si existe (común si se copia de terminal)
  cleaned = cleaned.replace(/^psql\s+/i, '');
  
  // Filtrado estricto: solo permitir caracteres válidos en una URL de base de datos
  // Esto elimina cualquier carácter invisible, espacios internos accidentales o basura Unicode
  cleaned = cleaned.replace(/[^a-zA-Z0-9.:/@?&=_\-%+]/g, '');
  
  process.env.DATABASE_URL = cleaned;
  
  // Diagnóstico seguro para logs de Vercel (no muestra el password)
  const safeLog = cleaned.length > 20 
    ? `${cleaned.substring(0, 10)}...${cleaned.substring(cleaned.length - 10)}` 
    : 'URL_TOO_SHORT';
  console.log(`[Database Setup] Length: ${cleaned.length}, Shape: ${safeLog}`);
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Añadir log de errores si estamos en producción para debuggear en Vercel
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
