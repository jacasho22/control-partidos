'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error);
  }, [error]);

  return (
    <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--error, #ef4444)', fontSize: '1.5rem', marginBottom: '1rem' }}>
        ¡Algo salió mal en el Dashboard!
      </h2>
      <p style={{ marginBottom: '1rem', color: 'var(--text-muted, #666)' }}>
        Ha ocurrido un error inesperado. Por favor, revisa los detalles a continuación:
      </p>
      
      <div style={{ 
        background: '#f8f9fa', 
        padding: '1.5rem', 
        borderRadius: '8px', 
        border: '1px solid var(--border, #ddd)',
        overflow: 'auto', 
        textAlign: 'left',
        margin: '0 auto 2rem',
        maxWidth: '600px',
        fontFamily: 'monospace'
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Mensaje:</p>
        <div style={{ marginBottom: '1rem', color: '#dc2626' }}>{error.message}</div>
        
        {error.digest && (
          <>
            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Digest ID:</p>
            <div style={{ color: '#666' }}>{error.digest}</div>
          </>
        )}
      </div>

      <button
        onClick={() => reset()}
        className="btn btn-primary"
        style={{ 
          padding: '0.75rem 1.5rem', 
          cursor: 'pointer',
          background: 'var(--primary, #2563eb)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1rem'
        }}
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
