import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        licenseNumber: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    let host = 'unknown';
    try {
      const url = process.env.DATABASE_URL || '';
      // Only expose host, never credentials
      host = new URL(url.replace(/^psql\s+/i, '').replace(/\u2026/g, '')).host;
    } catch {}
    return NextResponse.json({ error: message, dbHost: host }, { status: 500 });
  }
}
