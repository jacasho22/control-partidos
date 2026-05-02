'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import WhatsNewModal from '@/components/WhatsNewModal';

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
  showUpdateModal: boolean;
  currentVersion: string;
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetch('/api/dashboard')
        .then(res => res.json())
        .then(d => {
          setData(d);
          setLoading(false);
          if (d.showUpdateModal) setShowModal(true);
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
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Hola, {session.user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-muted" style={{ fontSize: '1.1rem' }}>Este es el resumen de tu actividad arbitral.</p>
      </div>

      <div className="grid">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
              Siguiente Partido
            </h3>
            {data.nextMatch ? (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.4rem' }}>{data.nextMatch.localTeam} vs {data.nextMatch.visitorTeam}</p>
                <p className="text-muted" style={{ fontSize: '0.9rem', fontWeight: 600 }}>📅 {formatDate(data.nextMatch.date)} · 🕒 {data.nextMatch.time}</p>
                <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.4rem' }}>📍 {data.nextMatch.venue}</p>
              </div>
            ) : (
              <p style={{ marginBottom: '1.5rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay partidos próximos.</p>
            )}
          </div>
          <Link href="/upload" className="btn btn-primary" style={{ width: '100%' }}>
            Subir Designación (PDF)
          </Link>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
              Ingresos Temporada
            </h3>
            <div style={{ fontSize: '2.75rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              {(data.totalEarnings || 0).toFixed(2)}€
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 700 }}>
              Semana: {(data.weeklyEarnings || 0).toFixed(2)}€
            </div>
          </div>
          <Link href="/statistics" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', display: 'block', marginTop: '1.5rem', textAlign: 'right' }}>
            Estadísticas detalladas →
          </Link>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
            Tu Actividad
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px' }}>
              <span style={{ fontWeight: 600, color: '#64748b' }}>Partidos totales</span>
              <strong style={{ fontSize: '1.25rem' }}>{data.totalMatches}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '10px' }}>
              <span style={{ fontWeight: 600, color: '#64748b' }}>Categoría top</span>
              <strong style={{ fontSize: '0.9rem', textAlign: 'right' }}>{data.topCategory}</strong>
            </div>
          </div>
        </div>
      </div>

      {showModal && data && (
        <WhatsNewModal 
          version={data.currentVersion} 
          onClose={() => setShowModal(false)} 
        />
      )}
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
