import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        licenseNumber: { label: 'Número de Licencia', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.licenseNumber || !credentials?.password) {
          throw new Error('Credenciales incompletas');
        }

        const user = await prisma.user.findUnique({
          where: {
            licenseNumber: credentials.licenseNumber,
          },
        });

        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Contraseña incorrecta');
        }

        return {
          id: user.id,
          name: user.name,
          licenseNumber: user.licenseNumber,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log('JWT Callback - User object:', JSON.stringify(user, null, 2));
        token.id = user.id;
        token.role = (user as any).role;
        token.licenseNumber = (user as any).licenseNumber;
      }
      console.log('JWT Callback - Token object ID:', token.id);
      return token;
    },
    async session({ session, token }) {
      console.log('Session Callback - Token object ID:', token.id);
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).licenseNumber = token.licenseNumber;
      }
      console.log('Session Callback - Session user ID:', (session.user as any)?.id);
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'secret-key-change-me',
};
