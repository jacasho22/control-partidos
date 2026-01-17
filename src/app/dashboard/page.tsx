'use client';

import { useState, useEffect } from 'react';
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

export default function Dashboard() {
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
          <p className="mb-4">Categoría más pitada: <strong>{data.topCategory}</strong></p>
          <p>Total partidos esta temporada: <strong>{data.totalMatches}</strong></p>
          <Link href="/statistics" style={{ color: 'var(--primary)', display: 'block', marginTop: '1.2rem' }}>
            Ver histórico →
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <h2 className="mb-4">Últimos Partidos</h2>
        {data.recentMatches.length > 0 ? (
          <div className="grid">
            {data.recentMatches.map((match) => (
              <div key={match.id} className="card" style={{ padding: '1rem' }}>
                <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(match.date)}</span>
                  <span style={{ fontSize: '0.8rem', background: 'var(--bg)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    #{match.matchNumber}
                  </span>
                </div>
                <p style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{match.localTeam} vs {match.visitorTeam}</p>
                <div className="flex" style={{ justifyContent: 'space-between', marginTop: '0.5rem', alignItems: 'center' }}>
                   <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{match.role}</span>
                   <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                      {((match.payment?.matchPayment || 0) + (match.payment?.gasPayment || 0)).toFixed(2)}€
                   </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center" style={{ padding: '3rem' }}>
            <p className="text-muted">Aún no has registrado ningún partido.</p>
            <p className="text-muted">Sube tu primer PDF de designación para empezar.</p>
          </div>
        )}
        {data.totalMatches > 3 && (
          <Link href="/matches" className="btn" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', border: '1px solid var(--border)' }}>
            Ver todos los partidos
          </Link>
        )}
      </div>
    </div>
  );
}
