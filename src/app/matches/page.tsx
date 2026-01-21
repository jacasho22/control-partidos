'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import MatchCard from '@/components/MatchCard';

interface Match {
  id: string;
  matchNumber: string;
  date: string;
  time: string;
  localTeam: string;
  visitorTeam: string;
  venue: string;
  role: string;
  category: { name: string };
  division: { name: string };
  payment?: {
    matchPayment: number;
    gasPayment: number;
  };
}

function MatchesContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
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
    <div style={{ paddingBottom: '4rem' }}>
      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h1>Mis Partidos</h1>
        <button className="btn btn-primary" onClick={() => router.push('/upload')}>
          Subir Nuevo PDF
        </button>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Buscar por equipo, categoría o número..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }}
        />
      </div>

      {sortedWeeks.length > 0 ? (
        sortedWeeks.map(weekStart => (
          <div key={weekStart} style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              Semana del {new Date(weekStart).toLocaleDateString('es-ES')}
            </h3>
            <div className="grid">
              {groupedMatches[weekStart].map(match => (
                <MatchCard key={match.id} match={match} />
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
