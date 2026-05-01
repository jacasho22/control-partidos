'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import "next-auth";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = session?.user as { role?: string } | undefined;
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (user?.role !== 'ADMIN') {
        router.push('/');
      } else {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router]);

  if (loading) return <div className="p-8 text-center">Cargando panel de administración...</div>;

  return (
    <div className="container">
      <h1 className="mb-4">Panel de Administración</h1>
      
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        <Link href="/admin/users" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>👥 Usuarios</h2>
                <p style={{ color: 'var(--text-muted)' }}>Gestionar árbitros y anotadores registrados.</p>
            </div>
        </Link>
        
        <div className="card" style={{ opacity: 0.7 }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>📊 Estadísticas Globales</h2>
            <p style={{ color: 'var(--text-muted)' }}>Próximamente...</p>
        </div>
      </div>
    </div>
  );
}
