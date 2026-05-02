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
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <button 
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: '#fee2e2',
          border: 'none',
          color: '#ef4444',
          cursor: 'pointer',
          padding: '0.4rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          transition: 'all 0.2s'
        }}
        className="delete-btn"
        title="Borrar partido"
        disabled={loading}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"></path>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
        </svg>
      </button>

      <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '1.25rem', paddingRight: '2.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
            {formattedDate}
          </span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            🕒 {match.time}
          </span>
        </div>
        <span style={{ 
          fontSize: '0.75rem', 
          background: '#f8fafc', 
          color: '#64748b',
          padding: '0.25rem 0.6rem', 
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontWeight: 600,
          height: 'fit-content'
        }}>
          #{match.matchNumber}
        </span>
      </div>

      <div className="mb-4">
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '1rem', 
          alignItems: 'center',
          background: '#f8fafc',
          padding: '1rem',
          borderRadius: '12px',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.4rem', color: '#1e293b' }}>{match.localTeam}</p>
            {match.localColor && (
              <span style={{ 
                fontSize: '0.7rem', 
                background: '#fff', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '6px',
                color: '#64748b',
                fontWeight: 700,
                border: '1px solid #e2e8f0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ fontSize: '0.9rem' }}>👕</span> {match.localColor}
              </span>
            )}
          </div>
          <div style={{ 
            fontSize: '0.75rem', 
            fontWeight: 900, 
            color: '#cbd5e1',
            textTransform: 'uppercase'
          }}>VS</div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <p style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.4rem', color: '#1e293b' }}>{match.visitorTeam}</p>
            {match.visitorColor && (
              <span style={{ 
                fontSize: '0.7rem', 
                background: '#fff', 
                padding: '0.2rem 0.5rem', 
                borderRadius: '6px',
                color: '#64748b',
                fontWeight: 700,
                border: '1px solid #e2e8f0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexDirection: 'row-reverse'
              }}>
                <span style={{ fontSize: '0.9rem' }}>👕</span> {match.visitorColor}
              </span>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#3b82f6', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 700 }}>
            {match.category.name}
          </span>
          <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 700 }}>
            {match.division.name}
          </span>
          <span style={{ fontSize: '0.75rem', background: '#fef2f2', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 700 }}>
            👤 {match.role}
          </span>
        </div>
        
        {isEditingAddress ? (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%', marginBottom: '0.75rem' }}>
              <input 
                type="text" 
                value={editedAddress} 
                onChange={(e) => setEditedAddress(e.target.value)}
                style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
              />
              <button onClick={handleSaveAddress} className="btn" style={{ padding: '0.5rem', background: 'var(--success)', color: 'white' }}>✓</button>
              <button onClick={() => setIsEditingAddress(false)} className="btn" style={{ padding: '0.5rem', background: '#f1f5f9' }}>✕</button>
            </div>
          ) : (
            <p style={{ 
              fontSize: '0.875rem', 
              marginBottom: '1rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: '#475569',
              background: '#fff',
              padding: '0.5rem 0.75rem',
              borderRadius: '10px',
              border: '1px solid #f1f5f9'
            }}>
              <span style={{ fontSize: '1.1rem' }}>📍</span> 
              <span style={{ fontWeight: 500 }}>{match.venue}</span>
              {match.venueAddress && match.venueAddress !== match.venue && (
                <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({match.venueAddress})</span>
              )}
              <button 
                onClick={() => setIsEditingAddress(true)} 
                title="Editar ubicación"
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </p>
          )}
        
        <div style={{ marginBottom: '1rem', position: 'relative' }}>
          {!showMapSelection ? (
            <button 
              onClick={() => setShowMapSelection(true)}
              className="btn"
              style={{ 
                fontSize: '0.8rem', 
                padding: '0.4rem 0.8rem', 
                background: '#f1f5f9', 
                color: '#475569',
                border: '1px solid #e2e8f0',
                width: '100%',
                marginTop: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
              </svg>
              Cómo llegar
            </button>
          ) : (
            <div style={{ 
              background: '#fff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              padding: '0.5rem',
              marginTop: '0.25rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <p style={{ fontSize: '0.8rem', textAlign: 'center', marginBottom: '0.5rem', fontWeight: 500, color: '#64748b' }}>Elige navegador:</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a 
                  href={`waze://?q=${encodeURIComponent(match.venue)}&navigate=yes`}
                  onClick={(e) => {
                    const webUrl = `https://www.waze.com/ul?q=${encodeURIComponent(match.venue)}&navigate=yes`;
                    if (!navigator.userAgent.match(/(iPhone|iPod|iPad|Android)/)) {
                      window.open(webUrl, '_blank');
                      e.preventDefault();
                    } else {
                      setTimeout(() => { window.location.href = webUrl; }, 500);
                    }
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{ 
                    flex: 1,
                    fontSize: '0.8rem', 
                    padding: '0.4rem', 
                    background: '#e0f2fe', 
                    color: '#0369a1',
                    border: '1px solid #bae6fd',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Waze
                </a>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.venue)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{ 
                    flex: 1,
                    fontSize: '0.8rem', 
                    padding: '0.4rem', 
                    background: '#dcfce7', 
                    color: '#15803d',
                    border: '1px solid #86efac',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Maps
                </a>
              </div>
              <button 
                onClick={() => setShowMapSelection(false)}
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#64748b' }}>
          <span style={{ fontWeight: 600, color: '#1e293b' }}>👤 Tu función:</span> {match.role}
        </p>
        
        {partners.length > 0 && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: '#f8fafc', 
            borderRadius: '12px', 
            border: '1px solid #f1f5f9' 
          }}>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Equipo Arbitral
            </p>
            {partners.map((partner, idx) => (
              <div key={idx} style={{ fontSize: '0.85rem', marginBottom: idx !== partners.length - 1 ? '0.6rem' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>{partner.role}</span>
                  <span style={{ fontWeight: 700, color: '#334155' }}>{partner.name}</span>
                </div>
                {partner.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.2rem', justifyContent: 'flex-end' }}>
                    <a 
                      href={`tel:${partner.phone}`} 
                      style={{ 
                        color: 'var(--primary)', 
                        fontWeight: 700, 
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#eff6ff',
                        padding: '0.1rem 0.5rem',
                        borderRadius: '6px'
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                      {partner.phone}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
        {showPaymentForm ? (
          <form onSubmit={handleUpdatePayment}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Partido (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={matchPayment}
                  onChange={(e) => setMatchPayment(e.target.value)}
                  placeholder="0.00"
                  style={{ padding: '0.5rem' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Gasolina (€)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="number"
                    step="0.01"
                    value={gasPayment}
                    onChange={(e) => setGasPayment(e.target.value)}
                    placeholder="0.00"
                    style={{ padding: '0.5rem' }}
                  />
                  <button 
                    type="button" 
                    onClick={handleAutoCalculateGas}
                    className="btn"
                    disabled={calculatingGas}
                    title="Calcular automáticamente"
                    style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)' }}
                  >
                    {calculatingGas ? '...' : '⚡'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex" style={{ justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowPaymentForm(false)} className="btn" style={{ background: '#f1f5f9' }}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>Guardar</button>
            </div>
          </form>
        ) : (
          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Total Cobro</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 900, color: totalPayment > 0 ? 'var(--success)' : '#cbd5e1' }}>
                {totalPayment.toFixed(2)}€
              </p>
            </div>
            <button onClick={() => setShowPaymentForm(true)} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              Editar Pago
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
