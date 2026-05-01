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
        interface UserWithMetadata {
          id: string;
          role: string;
          licenseNumber: string;
        }
        const u = user as unknown as UserWithMetadata;
        token.id = u.id;
        token.role = u.role;
        token.licenseNumber = u.licenseNumber;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        interface SessionUser {
          id: string;
          role: string;
          licenseNumber: string;
          name?: string | null;
          email?: string | null;
          image?: string | null;
        }
        session.user = {
          ...session.user,
          id: token.id,
          role: token.role,
          licenseNumber: token.licenseNumber,
        } as SessionUser;
      }
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
