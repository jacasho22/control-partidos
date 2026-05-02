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
    localColor?: string | null;
    visitorColor?: string | null;
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
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [showMapSelection, setShowMapSelection] = useState(false);
  const [editedAddress, setEditedAddress] = useState(match.venueAddress || match.venue);

  // Asegurar que partners sea un array si viene como JSON string o similar
  const partners = Array.isArray(match.partners) ? match.partners : [];

  const handleSaveAddress = async () => {
    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueAddress: editedAddress }),
      });

      if (!res.ok) throw new Error('Error al guardar la dirección');
      
      setIsEditingAddress(false);
      // Actualizar el objeto match localmente para que el cálculo de gasolina use el nuevo valor
      match.venueAddress = editedAddress;
      alert('Ubicación actualizada. Ahora puedes volver a calcular la gasolina.');
    } catch (_err) {
      alert('Error al guardar la nueva ubicación');
    }
  };



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

      // 2. Extraer ciudad del partido
      const venueCity = match.venueAddress || match.venue;

      // 3. Geocodificar: Ayuntamiento a Ayuntamiento
      const getCoords = async (query: string, type: 'origen' | 'destino') => {
        // Limpieza robusta del nombre (solo si es destino suele venir sucio, pero no hace daño limpiar origen)
        let cleanQuery = query;
        
        if (type === 'destino') {
            // 1. Quitar todo lo que vaya después de " vs " o " - " si parece separador de equipos
            cleanQuery = cleanQuery.split(/\s+vs\.?\s+/i)[0]; 
            if (cleanQuery.includes(' - ')) {
               cleanQuery = cleanQuery.split(' - ')[0]; 
            }
            // 2. Quitar paréntesis
            cleanQuery = cleanQuery.replace(/\(.*?\)/g, '');
            // 3. Limpieza de palabras clave
            cleanQuery = cleanQuery.replace(/Pabellón\s+Municipal\s+(de|del)?/i, ' ').trim();
            cleanQuery = cleanQuery.replace(/Pabellón|Complejo\s+Deportivo|Polideportivo|Ayuntamiento|Ciutat\s+Esportiva|Palau\s+d'Esports|Centre\s+Esportiu/gi, ' ').trim();
        }
        
        // 4. Normalizar espacios
        cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();
        
        console.log(`Geocoding Cleaned Query (${type}):`, cleanQuery);

        // Función centralizada de búsqueda con prioridad regional
        const searchNominatim = async (q: string, region_filter?: string) => {
           let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=es&addressdetails=1&limit=3`;
           if (region_filter) {
             url += `&state=${encodeURIComponent(region_filter)}`;
           }
           try {
             const res = await fetch(url);
             const data = await res.json();
             return data.length > 0 ? data[0] : null;
           } catch (_e) {
             return null;
           }
        };

        const regions = ['Comunidad Valenciana', 'Región de Murcia'];
        
        // Estrategia A: [Query] Ayuntamiento + Región
        for (const region of regions) {
          const res = await searchNominatim(`${cleanQuery} Ayuntamiento`, region);
          if (res) return { lat: res.lat, lon: res.lon, display_name: res.display_name, city_name: cleanQuery };
        }

        // Estrategia B: "Ayuntamiento de [Query]" + Región (Variante semántica)
        for (const region of regions) {
          const res = await searchNominatim(`Ayuntamiento de ${cleanQuery}`, region);
          if (res) return { lat: res.lat, lon: res.lon, display_name: res.display_name, city_name: cleanQuery };
        }

        // Estrategia C: [Query] (Solo ciudad) + Región -- CRÍTICO PARA TORREVIEJA
        for (const region of regions) {
          const res = await searchNominatim(cleanQuery, region);
          if (res) return { lat: res.lat, lon: res.lon, display_name: res.display_name, city_name: cleanQuery };
        }

        // Estrategia D: Globales (Fallbacks)
        let result = await searchNominatim(`${cleanQuery} Ayuntamiento`);
        if (result) return { lat: result.lat, lon: result.lon, display_name: result.display_name, city_name: cleanQuery };

        result = await searchNominatim(cleanQuery);
        if (result) return { lat: result.lat, lon: result.lon, display_name: result.display_name, city_name: cleanQuery };

        // Estrategia E: Split por comas
        if (cleanQuery.includes(',')) {
           const firstPart = cleanQuery.split(',')[0].trim();
           result = await searchNominatim(`${firstPart} Ayuntamiento`);
           if (result) return { lat: result.lat, lon: result.lon, display_name: result.display_name, city_name: cleanQuery };
        }

        if (result) {
           return {
             lat: result.lat,
             lon: result.lon,
             display_name: result.display_name,
             city_name: cleanQuery
           };
        }
        
        return null;
      };

      const homeCoords = await getCoords(settings.homeCity, 'origen');
      const matchCoords = await getCoords(venueCity, 'destino');

      if (!homeCoords || !matchCoords) {
        console.error('Geocoding failed for:', { home: settings.homeCity, match: venueCity });
        throw new Error(`No se pudo localizar: ${!homeCoords ? 'Tu ciudad' : 'Ciudad del partido'}`);
      }

      // 4. Obtener distancia por carretera mediante OSRM
      const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${homeCoords.lon},${homeCoords.lat};${matchCoords.lon},${matchCoords.lat}?overview=false`);
      const osrmData = await osrmRes.json();
      
      if (osrmData.code !== 'Ok') throw new Error('Error al calcular la ruta por carretera');
      
       const distanceKm = osrmData.routes[0].distance / 1000; // OSRM devuelve metros
       const price = settings.pricePerKm || 0.23;
       const totalGas = (distanceKm * 2) * price; // Ida y vuelta
       
       let warning = '';
       if (distanceKm > 100) warning = '⚠️ ¡ATENCIÓN! La distancia parece muy larga (>100km). Verifica las ubicaciones.\n';

       // 5. Confirmar con el usuario (Debug Mode Mejorado)
       const confirmMsg = `📍 CÁLCULO DE GASOLINA\n\n` +
                          `${warning}` +
                          `❓ Input Original: "${venueCity}"\n` +
                          `--------------------------------------------------\n` +
                          `🏠 Origen: ${homeCoords.city_name} (Detectado: ${homeCoords.display_name?.split(',')[0]})\n` +
                          `   [📍 ${homeCoords.display_name}]\n\n` +
                          `🏀 Destino: ${matchCoords.city_name} (Detectado: ${matchCoords.display_name?.split(',')[0]})\n` +
                          `   [📍 ${matchCoords.display_name}]\n\n` +
                          `📏 Distancia: ${distanceKm.toFixed(1)} km (Solo ida)\n` +
                          `💰 Precio: ${price} €/km\n` +
                          `Total a cobrar (Ida y Vuelta): ${totalGas.toFixed(2)} €\n\n` +
                          `¿Confirmar este importe?`;
                          
       if (window.confirm(confirmMsg)) {
         setGasPayment(totalGas.toFixed(2));
       }
     } catch (err) {
       console.error('Error calculating gas:', err);
       const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
       alert(`Error al calcular: ${errorMessage || 'Inténtalo manualmente'}`);
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
    <div className="card" style={{ position: 'relative', overflow: 'hidden', border: '1px solid #edf2f7', padding: '0' }}>
      {/* Header con degradado suave */}
      <div style={{ 
        background: 'linear-gradient(to right, #f8fafc, #ffffff)', 
        padding: '1.25rem', 
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ 
            fontSize: '0.8rem', 
            fontWeight: 800, 
            color: 'var(--primary)', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            marginBottom: '0.2rem'
          }}>
            {formattedDate}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              {match.time}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>#{match.matchNumber}</span>
          </div>
        </div>
        
        <button 
          onClick={handleDelete}
          style={{
            background: '#fff',
            border: '1px solid #fee2e2',
            color: '#ef4444',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.05)'
          }}
          className="delete-btn-hover"
          title="Borrar partido"
          disabled={loading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </button>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {/* Sección de Equipos */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.3rem' }}>{match.localTeam}</p>
              {match.localColor && (
                <span style={{ 
                  fontSize: '0.7rem', 
                  background: '#f1f5f9', 
                  padding: '0.2rem 0.6rem', 
                  borderRadius: '6px',
                  color: '#475569',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '0.8rem' }}>👕</span> {match.localColor}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#cbd5e1' }}>VS</div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.3rem' }}>{match.visitorTeam}</p>
              {match.visitorColor && (
                <span style={{ 
                  fontSize: '0.7rem', 
                  background: '#f1f5f9', 
                  padding: '0.2rem 0.6rem', 
                  borderRadius: '6px',
                  color: '#475569',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexDirection: 'row-reverse'
                }}>
                  <span style={{ fontSize: '0.8rem' }}>👕</span> {match.visitorColor}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info adicional (Categoría, Sede, Rol) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '8px', fontWeight: 700 }}>
              {match.category.name}
            </span>
            <span style={{ fontSize: '0.75rem', background: '#f8fafc', color: '#64748b', padding: '0.25rem 0.75rem', borderRadius: '8px', fontWeight: 700, border: '1px solid #f1f5f9' }}>
              {match.division.name}
            </span>
          </div>

          <div style={{ 
            fontSize: '0.85rem', 
            color: '#475569', 
            background: '#f8fafc', 
            padding: '0.85rem', 
            borderRadius: '12px',
            border: '1px solid #f1f5f9'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem' }}>📍</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', lineHeight: 1.3 }}>{match.venue}</p>
                {match.venueAddress && match.venueAddress !== match.venue && (
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.1rem' }}>{match.venueAddress}</p>
                )}
              </div>
              <button 
                onClick={() => setIsEditingAddress(true)} 
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#cbd5e1' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>👤</span>
              <p style={{ fontWeight: 600 }}>{match.role}</p>
            </div>
          </div>
        </div>

        {/* Equipo Arbitral */}
        {partners.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ 
              fontSize: '0.7rem', 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              color: '#94a3b8', 
              marginBottom: '0.75rem', 
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              Equipo Arbitral
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {partners.map((partner, idx) => (
                <div key={idx} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '0.6rem 0.85rem',
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>{partner.role}</span>
                    <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>{partner.name}</span>
                  </div>
                  {partner.phone && (
                    <a 
                      href={`tel:${partner.phone}`} 
                      style={{ 
                        background: '#eff6ff', 
                        color: 'var(--primary)', 
                        padding: '0.4rem', 
                        borderRadius: '8px',
                        display: 'flex'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer con Pago */}
        <div style={{ 
          marginTop: '1.5rem', 
          paddingTop: '1.25rem', 
          borderTop: '1px solid #f1f5f9',
          background: showPaymentForm ? '#f8fafc' : 'transparent',
          margin: '0 -1.25rem -1.25rem -1.25rem',
          padding: '1.25rem',
          borderRadius: '0 0 12px 12px'
        }}>
          {showPaymentForm ? (
            <form onSubmit={handleUpdatePayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.7rem' }}>Honorarios (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={matchPayment}
                    onChange={(e) => setMatchPayment(e.target.value)}
                    style={{ padding: '0.6rem', fontSize: '0.9rem' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.7rem' }}>Gasolina (€)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={gasPayment}
                      onChange={(e) => setGasPayment(e.target.value)}
                      style={{ padding: '0.6rem', fontSize: '0.9rem' }}
                    />
                    <button 
                      type="button" 
                      onClick={handleAutoCalculateGas}
                      className="btn"
                      disabled={calculatingGas}
                      style={{ padding: '0.6rem', background: '#fff', border: '1px solid #e2e8f0' }}
                    >
                      {calculatingGas ? '...' : '⚡'}
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowPaymentForm(false)} className="btn" style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, fontSize: '0.85rem' }} disabled={loading}>Guardar</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Total Liquidación</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 900, color: totalPayment > 0 ? 'var(--success)' : '#cbd5e1', letterSpacing: '-0.02em' }}>
                  {totalPayment.toFixed(2)}€
                </p>
              </div>
              <button onClick={() => setShowPaymentForm(true)} className="btn btn-secondary" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
                Editar Pago
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
