'use client';

import { useState } from 'react';

interface Partner {
  role: string;
  name: string;
  phone?: string;
}

interface MatchCardProps {
  match: {
    id: string;
    matchNumber: string;
    date: Date | string;
    time: string;
    localTeam: string;
    visitorTeam: string;
    venue: string;
    venueAddress?: string;
    role: string;
    category: { name: string };
    division: { name: string };
    partners?: Partner[] | null;
    payment?: {
      matchPayment: number;
      gasPayment: number;
    } | null;
  };
  onPaymentUpdate?: () => void;
}

export default function MatchCard({ match, onPaymentUpdate }: MatchCardProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [matchPayment, setMatchPayment] = useState(match.payment?.matchPayment?.toString() || '');
  const [gasPayment, setGasPayment] = useState(match.payment?.gasPayment?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [calculatingGas, setCalculatingGas] = useState(false);

  // Asegurar que partners sea un array si viene como JSON string o similar
  const partners = Array.isArray(match.partners) ? match.partners : [];

  const handleAutoCalculateGas = async () => {
    setCalculatingGas(true);
    try {
      // 1. Obtener ajustes del usuario
      const settingsRes = await fetch('/api/user/settings');
      if (!settingsRes.ok) throw new Error('No se pudieron obtener los ajustes');
      const settings = await settingsRes.json();
      
      if (!settings.homeCity) {
        alert('Por favor, configura tu ciudad de residencia en Ajustes primero.');
        setCalculatingGas(false);
        return;
      }

      // 2. Extraer ciudad del partido (asumiendo que está en el venue o venueAddress)
      // Usualmente "Pabellón Municipal de [Ciudad]"
      const venueCity = match.venueAddress || match.venue;

      // 3. Geocodificar ciudades y obtener distancia (usando Nominatim y OSRM - servicios gratuitos)
      const getCoords = async (query: string) => {
        // Limpiar la consulta para mejorar resultados
        const cleanQuery = query.replace(/Pabellón Municipal (de|del)/i, '').trim();
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery + ', España')}&limit=1`);
        const data = await res.json();
        if (data.length > 0) return { lat: data[0].lat, lon: data[0].lon };
        
        // Si falla, intentar una búsqueda más genérica (solo la ciudad)
        if (query.includes(',')) {
          const cityOnly = query.split(',')[0].trim();
          const res2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityOnly + ', España')}&limit=1`);
          const data2 = await res2.json();
          if (data2.length > 0) return { lat: data2[0].lat, lon: data2[0].lon };
        }
        
        return null;
      };

      const homeCoords = await getCoords(settings.homeCity);
      const matchCoords = await getCoords(venueCity);

      if (!homeCoords || !matchCoords) {
        console.error('Geocoding failed for:', { home: settings.homeCity, match: venueCity });
        throw new Error('No se pudo localizar una de las ciudades.');
      }

      // 4. Obtener distancia por carretera mediante OSRM
      const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${homeCoords.lon},${homeCoords.lat};${matchCoords.lon},${matchCoords.lat}?overview=false`);
      const osrmData = await osrmRes.json();
      
      if (osrmData.code !== 'Ok') throw new Error('Error al calcular la ruta');
      
      const distanceKm = osrmData.routes[0].distance / 1000; // OSRM devuelve metros
      const totalGas = (distanceKm * 2) * (settings.pricePerKm || 0.23); // Ida y vuelta
      
      setGasPayment(totalGas.toFixed(2));
    } catch (err) {
      console.error('Error calculating gas:', err);
      alert('Error al calcular la gasolina automáticamente. Por favor, revísalo manualmente.');
    } finally {
      setCalculatingGas(false);
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          matchPayment: parseFloat(matchPayment) || 0,
          gasPayment: parseFloat(gasPayment) || 0,
        }),
      });

      if (res.ok) {
        setShowPaymentForm(false);
        if (onPaymentUpdate) onPaymentUpdate();
      }
    } catch (err) {
      console.error('Error updating payment:', err);
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date(match.date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres borrar este partido? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        if (onPaymentUpdate) onPaymentUpdate();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al borrar el partido');
      }
    } catch (err) {
      console.error('Error deleting match:', err);
      alert('Error de conexión al intentar borrar el partido');
    } finally {
      setLoading(false);
    }
  };

  const totalPayment = (match.payment?.matchPayment || 0) + (match.payment?.gasPayment || 0);

  return (
    <div className="card" style={{ position: 'relative' }}>
      <button 
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          background: 'none',
          border: 'none',
          color: '#ef4444',
          cursor: 'pointer',
          padding: '0.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
        title="Borrar partido"
        disabled={loading}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>

      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '0.5rem', paddingRight: '2rem' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{formattedDate} - {match.time}</span>
        <span style={{ fontSize: '0.8rem', background: 'var(--bg)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
          #{match.matchNumber}
        </span>
      </div>

      <div className="mb-4">
        <p style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '0.25rem' }}>{match.localTeam} vs {match.visitorTeam}</p>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{match.category.name} - {match.division.name}</p>
        <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>📍 {match.venue}</p>
        
        <div style={{ marginBottom: '1rem' }}>
          <a 
            href={`waze://?q=${encodeURIComponent(match.venue)}&navigate=yes`}
            onClick={(e) => {
              // Fallback to web link if scheme is not supported (desktop or no app)
              const webUrl = `https://www.waze.com/ul?q=${encodeURIComponent(match.venue)}&navigate=yes`;
              if (!navigator.userAgent.match(/(iPhone|iPod|iPad|Android)/)) {
                window.open(webUrl, '_blank');
                e.preventDefault();
              } else {
                // On mobile, try to open app, then fallback to web
                setTimeout(() => {
                  window.location.href = webUrl;
                }, 500);
              }
            }}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
            style={{ 
              fontSize: '0.8rem', 
              padding: '0.4rem 0.8rem', 
              background: '#f1f5f9', 
              color: '#475569',
              border: '1px solid #e2e8f0',
              width: '100%',
              marginTop: '0.25rem'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Abrir en Waze
          </a>
        </div>

        <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>👤 Tu función: <strong>{match.role}</strong></p>
        
        {partners.length > 0 && (
          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
              Equipo Arbitral
            </p>
            {partners.map((partner, idx) => (
              <div key={idx} style={{ fontSize: '0.85rem', marginBottom: idx !== partners.length - 1 ? '0.5rem' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', width: '90px', flexShrink: 0 }}>{partner.role}:</span>
                  <span style={{ flex: 1, fontWeight: 500 }}>{partner.name}</span>
                </div>
                {partner.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.1rem', color: 'var(--primary)', fontWeight: 500 }}>
                    <svg style={{ marginRight: '0.4rem' }} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <a href={`tel:${partner.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{partner.phone}</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
        {showPaymentForm ? (
          <form onSubmit={handleUpdatePayment}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Partido (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={matchPayment}
                  onChange={(e) => setMatchPayment(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.8rem' }}>Gasolina (€)</label>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <input
                    type="number"
                    step="0.01"
                    value={gasPayment}
                    onChange={(e) => setGasPayment(e.target.value)}
                    placeholder="0.00"
                  />
                  <button 
                    type="button" 
                    onClick={handleAutoCalculateGas}
                    className="btn"
                    disabled={calculatingGas}
                    style={{ background: '#f1f5f9', padding: '0 0.5rem', border: '1px solid var(--border)', fontSize: '1rem' }}
                    title="Calcular según distancia ayuntamientos"
                  >
                    {calculatingGas ? '...' : '🧮'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex" style={{ justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn" style={{ fontSize: '0.8rem' }} onClick={() => setShowPaymentForm(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8rem' }} disabled={loading}>
                {loading ? '...' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pago total:</p>
              <p style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '1.1rem' }}>
                {totalPayment.toFixed(2)}€
              </p>
              {totalPayment > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({match.payment?.matchPayment} P + {match.payment?.gasPayment} G)
                </span>
              )}
            </div>
            <button className="btn" style={{ fontSize: '0.85rem', border: '1px solid var(--border)' }} onClick={() => setShowPaymentForm(true)}>
              {totalPayment > 0 ? 'Editar Pago' : 'Añadir Pago'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
