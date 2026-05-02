'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MatchCard from '@/components/MatchCard';

interface Partner {
  role: string;
  name: string;
  phone?: string;
}

interface Match {
  id: string;
  matchNumber: string;
  date: string;
  time: string;
  localTeam: string;
  visitorTeam: string;
  venue: string;
  role: string;
  localColor?: string;
  visitorColor?: string;
  category: { name: string };
  division: { name: string };
  partners?: Partner[];
  payment?: {
    matchPayment: number;
    gasPayment: number;
  };
}

function MatchesContent() {
  const { status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/matches');
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches);
        setFilteredMatches(data.matches);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchMatches();
    }
  }, [status, router]);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredMatches(matches);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = matches.filter(match => 
        match.localTeam.toLowerCase().includes(lowerTerm) ||
        match.visitorTeam.toLowerCase().includes(lowerTerm) ||
        match.category.name.toLowerCase().includes(lowerTerm) ||
        match.matchNumber.includes(lowerTerm)
      );
      setFilteredMatches(filtered);
    }
  }, [searchTerm, matches]);

  if (loading) return <div className="text-center mt-4">Cargando partidos...</div>;

  const getWeekStart = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = (day + 2) % 7;
    const friday = new Date(d);
    friday.setDate(d.getDate() - diff);
    return friday;
  };

  const groupedMatches = filteredMatches.reduce((acc: Record<string, Match[]>, match: Match) => {
    const weekStart = getWeekStart(match.date);
    const key = weekStart.toISOString().split('T')[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(match);
    return acc;
  }, {});

  const sortedWeeks = Object.keys(groupedMatches).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ paddingBottom: '6rem' }}>
      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Mis Partidos</h1>
        <button className="btn btn-primary" onClick={() => router.push('/upload')}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Subir PDF
        </button>
      </div>

      <div className="card" style={{ marginBottom: '2.5rem', padding: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por equipo, categoría o número..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: 'none', background: 'transparent' }}
          />
        </div>
      </div>

      {sortedWeeks.length > 0 ? (
        sortedWeeks.map(weekStart => (
          <div key={weekStart} style={{ marginBottom: '3rem' }}>
            <h3 style={{ 
              marginBottom: '1.25rem', 
              color: 'var(--text)', 
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ width: '4px', height: '1.2rem', background: 'var(--primary)', borderRadius: '99px' }}></span>
              Semana del {new Date(weekStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
            </h3>
            <div className="grid">
              {groupedMatches[weekStart].map(match => (
                <MatchCard key={match.id} match={match} onPaymentUpdate={fetchMatches} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center" style={{ padding: '4rem 0', color: 'var(--text-muted)' }}>
          <p>No se encontraron partidos.</p>
        </div>
      )}
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<div className="text-center p-4">Cargando partidos...</div>}>
      <MatchesContent />
    </Suspense>
  );
}
