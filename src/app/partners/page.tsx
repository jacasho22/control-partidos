'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface PartnerStats {
  name: string;
  count: number;
  phone: string | null;
  role: string;
}

function PartnersContent() {
  const { status } = useSession();
  const router = useRouter();
  const [partners, setPartners] = useState<PartnerStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchPartners();
    }
  }, [status, router]);

  const fetchPartners = async () => {
    try {
      const res = await fetch('/api/partners');
      if (res.ok) {
        const data = await res.json();
        setPartners(data.partners);
      }
    } catch (err) {
      console.error('Error fetching partners:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-center mt-4">Cargando historial...</div>;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h1>Historial de Compañeros</h1>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Buscar compañero por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px' }}
        />
      </div>

      <div className="grid">
        {filteredPartners.length > 0 ? (
          filteredPartners.map((partner, index) => (
            <div key={index} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{partner.name}</h3>
                <span style={{ 
                  background: 'var(--primary)', 
                  color: 'white', 
                  padding: '0.2rem 0.6rem', 
                  borderRadius: '12px', 
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  {partner.count} {partner.count === 1 ? 'partido' : 'partidos'}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Última función: {partner.role}</p>
              {partner.phone && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <a href={`tel:${partner.phone}`} style={{ fontWeight: 500 }}>{partner.phone}</a>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center" style={{ padding: '2rem 0', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
            {searchTerm ? 'No se encontraron compañeros con ese nombre.' : 'Aún no tienes compañeros registrados en tus partidos.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PartnersPage() {
  return (
    <Suspense fallback={<div className="text-center p-4">Cargando...</div>}>
      <PartnersContent />
    </Suspense>
  );
}
