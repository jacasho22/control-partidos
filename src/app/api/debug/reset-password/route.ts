import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  const licenseNumber = '31781';
  const name = 'VERONICA GARCIA TERUEL';
  const password = 'password123';
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Upsert para crear o resetear
    const user = await prisma.user.upsert({
      where: { licenseNumber },
      update: { password: hashedPassword },
      create: {
        licenseNumber,
        name,
        password: hashedPassword,
        refereeType: 'PISTA',
        role: 'USER',
      },
    });

    return NextResponse.json({
      message: `Usuario ${user.licenseNumber} listo`,
      licenseNumber: user.licenseNumber,
      name: user.name,
      password: password
    });
  } catch (error) {
    console.error('Error en setup-user route:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
