'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Match {
  id: string;
  matchNumber: string;
  date: string;
  time: string;
  localTeam: string;
  visitorTeam: string;
  venue: string;
  role: string;
  payment?: {
    matchPayment: number;
    gasPayment: number;
  };
}

interface DashboardData {
  nextMatch: Match | null;
  recentMatches: Match[];
  weeklyEarnings: number;
  totalEarnings: number;
  topCategory: string;
  totalMatches: number;
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetch('/api/dashboard')
        .then(res => res.json())
        .then(d => {
          setData(d);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else if (status === 'loading') {
      // Do nothing while loading session
    }
  }, [status, router]);

  if (status === 'loading' || loading) return <div className="text-center mt-4">Cargando...</div>;
  if (!session || !data) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <h1 className="mb-4">Hola, {session.user?.name} 👋</h1>
      <p className="text-muted mb-4">Bienvenido a tu panel de control de designaciones.</p>

      <div className="grid">
        <div className="card">
          <h3>Siguiente Partido</h3>
          {data.nextMatch ? (
            <div style={{ margin: '1rem 0' }}>
              <p style={{ fontWeight: 'bold' }}>{data.nextMatch.localTeam} vs {data.nextMatch.visitorTeam}</p>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>{formatDate(data.nextMatch.date)} - {data.nextMatch.time}</p>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>📍 {data.nextMatch.venue}</p>
            </div>
          ) : (
            <p style={{ margin: '1rem 0', color: 'var(--text-muted)' }}>No tienes partidos próximos registrados.</p>
          )}
          <Link href="/upload" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
            Subir Designación (PDF)
          </Link>
        </div>

        <div className="card">
          <h3>Ingresos Temporada</h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0', color: 'var(--primary)' }}>
            {data.totalEarnings.toFixed(2)}€
          </div>
          <p className="text-muted">Semana actual: {data.weeklyEarnings.toFixed(2)}€</p>
          <Link href="/statistics" style={{ color: 'var(--primary)', display: 'block', marginTop: '1rem' }}>
            Ver estadísticas detalladas →
          </Link>
        </div>

        <div className="card">
          <h3>Estadísticas de Uso</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Partidos totales:</span>
            <strong>{data.totalMatches}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Categoría más frecuente:</span>
            <strong>{data.topCategory}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="text-center p-4">Cargando Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
