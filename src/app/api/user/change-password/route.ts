import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    // 1. Obtener usuario con su hash actual
    const user = await prisma.user.findUnique({
        where: { id: (session.user as any).id },
    });

    if (!user || !user.password) {
        return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }

    // 2. Verificar contraseña actual
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
        return NextResponse.json({ message: 'La contraseña actual es incorrecta' }, { status: 400 });
    }

    // 3. Hashear nueva contraseña y actualizar
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });

    return NextResponse.json({ message: 'Contraseña actualizada correctamente' });

  } catch (err) {
    console.error('Error changing password:', err);
    return NextResponse.json({ message: 'Error al cambiar la contraseña' }, { status: 500 });
  }
}
