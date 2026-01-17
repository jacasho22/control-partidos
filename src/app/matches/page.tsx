'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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

export default function MatchesPage() {
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
    <div style={{ paddingBottom: '4rem' }}>
      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h1>Mis Partidos</h1>
        <button className="btn btn-primary" onClick={() => router.push('/upload')}>
          Subir Nuevo PDF
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <input 
          type="text" 
          placeholder="Buscar por equipo, categoría o número..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '0.8rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
            color: 'var(--foreground)',
            fontSize: '1rem'
          }}
        />
      </div>

      {filteredMatches.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem' }}>
          {matches.length === 0 ? (
            <>
              <h3>No hay partidos registrados</h3>
              <p className="text-muted mt-2">Sube una designación en PDF para empezar a llevar el control.</p>
            </>
          ) : (
             <p className="text-muted">No se encontraron partidos con &quot;{searchTerm}&quot;</p>
          )}
        </div>
      ) : (
        <div>
          {sortedWeeks.map(weekKey => (
            <div key={weekKey} style={{ marginBottom: '3rem' }}>
              <h2 style={{ 
                borderBottom: '2px solid var(--border)', 
                paddingBottom: '0.5rem', 
                marginBottom: '1.5rem', 
                color: 'var(--foreground)',
                fontSize: '1.5rem'
              }}>
                <span style={{ color: 'var(--primary)', marginRight: '0.5rem' }}>📅</span>
                Semana del {new Date(weekKey).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
              <div className="grid">
                {groupedMatches[weekKey].map((match) => (
                  <MatchCard key={match.id} match={match} onPaymentUpdate={fetchMatches} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
