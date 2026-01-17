import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  const licenseNumber = '31781';
  const passwordToTest = 'password123';
  
  try {
    const user = await prisma.user.findUnique({
      where: { licenseNumber },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado en DB' });
    }

    const isValid = await bcrypt.compare(passwordToTest, user.password);

    return NextResponse.json({
      licenseNumber,
      testPassword: passwordToTest,
      hashInDb: user.password,
      isValid,
      message: isValid ? 'Credenciales VÁLIDAS' : 'Credenciales INVÁLIDAS'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
