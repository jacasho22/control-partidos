import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const licenseNumber = String(body.licenseNumber ?? '').trim();
    const name = String(body.name ?? '').trim();
    const password = String(body.password ?? '').trim();
    const refereeType = String(body.refereeType ?? '').trim().toUpperCase();

    if (!licenseNumber || !name || !password || !refereeType) {
      return NextResponse.json({ message: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    if (!['PISTA', 'MESA'].includes(refereeType)) {
      return NextResponse.json({ message: 'Tipo de árbitro inválido' }, { status: 400 });
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
    const message =
      typeof (error as any)?.message === 'string'
        ? (error as any).message
        : 'Error interno del servidor';
    const code = (error as any)?.code;

    if (code === 'P2002') {
      return NextResponse.json({ message: 'El número de licencia ya existe' }, { status: 409 });
    }
    if (code === 'P1001') {
      return NextResponse.json({ message: 'No se puede conectar a la base de datos' }, { status: 503 });
    }
    if (code === 'P1003') {
      return NextResponse.json({ message: 'Faltan tablas en la base de datos' }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
}
