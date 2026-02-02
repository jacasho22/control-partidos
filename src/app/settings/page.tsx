'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [homeCity, setHomeCity] = useState('');
  const [pricePerKm, setPricePerKm] = useState('0.23');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status, router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/user/settings');
      if (res.ok) {
        const data = await res.json();
        setHomeCity(data.homeCity || '');
        setPricePerKm(data.pricePerKm?.toString() || '0.23');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeCity, pricePerKm: parseFloat(pricePerKm) })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Ajustes guardados correctamente' });
      } else {
        setMessage({ type: 'error', text: 'Error al guardar los ajustes' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center p-8">Cargando ajustes...</div>;

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1 className="mb-4">Ajustes de Usuario</h1>
      <div className="card">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Tu Ciudad (para el cálculo de gasolina)</label>
            <input
              type="text"
              value={homeCity}
              onChange={(e) => setHomeCity(e.target.value)}
              placeholder="Ej: Alicante, Elche, Valencia..."
              required
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Se usará para calcular la distancia al ayuntamiento de la ciudad del partido.
            </p>
          </div>

          <div className="form-group">
            <label>Precio por Kilómetro (€/km)</label>
            <input
              type="number"
              step="0.01"
              value={pricePerKm}
              onChange={(e) => setPricePerKm(e.target.value)}
              required
            />
          </div>

          {message.text && (
            <div style={{ 
              padding: '0.75rem', 
              borderRadius: 'var(--radius)', 
              marginBottom: '1rem',
              background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
              color: message.type === 'success' ? '#065f46' : '#991b1b',
              fontSize: '0.9rem'
            }}>
              {message.text}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Ajustes'}
          </button>
        </form>
      </div>
    </div>
  );
}
