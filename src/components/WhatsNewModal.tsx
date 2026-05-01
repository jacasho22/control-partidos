'use client';

import { useState } from 'react';

interface WhatsNewModalProps {
  version: string;
  onClose: () => void;
}

export default function WhatsNewModal({ version, onClose }: WhatsNewModalProps) {
  const [loading, setLoading] = useState(false);

  const handleClose = async () => {
    setLoading(true);
    try {
      await fetch('/api/user/acknowledge-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });
      onClose();
    } catch (error) {
      console.error('Error acknowledge version:', error);
      onClose(); // Cerrar de todos modos
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
      padding: '1rem'
    }}>
      <div className="card" style={{
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'slideUp 0.3s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '3rem' }}>🚀</span>
          <h2 style={{ marginTop: '1rem' }}>¡Actualización v{version} Instalada!</h2>
          <p className="text-muted">Hemos mejorado tu experiencia con nuevas herramientas profesionales.</p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Novedades destacadas:</h4>
          <ul style={{ paddingLeft: '1.2rem', lineHeight: '1.6' }}>
            <li style={{ marginBottom: '0.8rem' }}>
              <strong>🤖 Tarifas Automáticas:</strong> Los importes de arbitraje se calculan solos según la categoría y tu función.
            </li>
            <li style={{ marginBottom: '0.8rem' }}>
              <strong>🎨 Equipaciones:</strong> Ahora extraemos automáticamente los colores de las camisetas de los PDFs.
            </li>
            <li style={{ marginBottom: '0.8rem' }}>
              <strong>🛡️ Soft Delete:</strong> Tus datos están más seguros. Los borrados son reversibles para proteger tu histórico.
            </li>
            <li style={{ marginBottom: '0.8rem' }}>
              <strong>📈 Pipeline CI/CD:</strong> Despliegues automáticos y ultra-seguros con validaciones de calidad profesional.
            </li>
            <li style={{ marginBottom: '0.8rem' }}>
              <strong>🧪 Suite de Tests:</strong> Hemos añadido pruebas automáticas para garantizar que el sistema nunca falle.
            </li>
          </ul>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleClose}
          disabled={loading}
          style={{ width: '100%', padding: '1rem' }}
        >
          {loading ? 'Procesando...' : '¡Entendido, vamos allá!'}
        </button>
      </div>

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
