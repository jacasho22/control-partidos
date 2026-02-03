import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AuthProvider from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Control de Partidos - Árbitros',
  description: 'Gestión de designaciones arbitrales y estadísticas',
  icons: {
    icon: '/favicon.png',
    apple: '/icons/icon-192x192.png',
  },
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          <main className="container">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
