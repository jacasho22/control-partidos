'use client';

import { useState } from 'react';

interface MatchCardProps {
  match: {
    id: string;
    matchNumber: string;
    date: Date | string;
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
    } | null;
  };
  onPaymentUpdate?: () => void;
}

export default function MatchCard({ match, onPaymentUpdate }: MatchCardProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [matchPayment, setMatchPayment] = useState(match.payment?.matchPayment?.toString() || '');
  const [gasPayment, setGasPayment] = useState(match.payment?.gasPayment?.toString() || '');
  const [loading, setLoading] = useState(false);

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
        <p style={{ fontWeight: 'bold' }}>{match.localTeam} vs {match.visitorTeam}</p>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>{match.category.name} - {match.division.name}</p>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>📍 {match.venue}</p>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>👤 {match.role}</p>
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
                <input
                  type="number"
                  step="0.01"
                  value={gasPayment}
                  onChange={(e) => setGasPayment(e.target.value)}
                  placeholder="0.00"
                />
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
