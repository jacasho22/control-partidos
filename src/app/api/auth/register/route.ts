import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { licenseNumber, name, password, refereeType } = await req.json();

    if (!licenseNumber || !name || !password || !refereeType) {
      return NextResponse.json({ message: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { licenseNumber },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'El número de licencia ya está registrado' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        licenseNumber,
        name,
        password: hashedPassword,
        refereeType,
        role: 'USER',
      },
    });

    return NextResponse.json({ message: 'Usuario creado correctamente' }, { status: 201 });
  } catch (error) {
    console.error('Error in registration:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}
