'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedMatches, setParsedMatches] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
      setError('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await fetch('/api/matches/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setParsedMatches(data.matches);
        if (data.matches.length === 0) {
          setError('No se encontraron partidos en los PDFs.');
        }
      } else {
        const data = await res.json();
        setError(data.message || 'Error al procesar los PDFs');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(`Error de conexión al servidor: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/matches/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: parsedMatches }),
      });

      if (res.ok) {
        router.push('/matches');
      } else {
        const data = await res.json();
        setError(`Error al guardar: ${data.message}${data.error ? ' - ' + data.error : ''}`);
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setError(`Error de red al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="mb-4">Subir Designaciones</h1>
      <p className="text-muted mb-4">Sube uno o varios PDFs que descargas de la web para extraer automáticamente tus partidos.</p>

      <div className="card">
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Selecciona los archivos PDF</label>
            <input type="file" accept=".pdf" multiple onChange={handleFileChange} />
            {files.length > 0 && (
              <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                {files.length} archivo{files.length > 1 ? 's' : ''} seleccionado{files.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button type="submit" className="btn btn-primary" disabled={files.length === 0 || loading}>
            {loading ? 'Procesando...' : `Analizar ${files.length > 0 ? files.length : ''} PDF${files.length > 1 ? 's' : ''}`}
          </button>
        </form>
      </div>

      {error && <div className="card" style={{ background: '#fee2e2', color: 'var(--error)', marginTop: '1rem' }}>{error}</div>}

      {parsedMatches.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-4">Partidos Encontrados ({parsedMatches.length})</h2>
          <div className="grid">
            {parsedMatches.map((match, idx) => (
              <div key={idx} className="card">
                <div className="flex" style={{ justifyContent: 'space-between' }}>
                  <strong>{match.date} - {match.time}</strong>
                  <span style={{ fontSize: '0.8rem', background: 'var(--bg)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    #{match.matchNumber}
                  </span>
                </div>
                <div className="mt-4">
                  <p><strong>{match.localTeam}</strong> vs <strong>{match.visitorTeam}</strong></p>
                  <p className="text-muted" style={{ fontSize: '0.9rem' }}>{match.category} - {match.division}</p>
                </div>
                <div className="mt-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontSize: '0.9rem' }}>
                  <p>📍 {match.venue}</p>
                  <p>👤 {match.role}</p>
                  {match.partners && match.partners.length > 0 && (
                    <div className="mt-2" style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.5rem' }}>
                      <p style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '0.2rem' }}>Compañeros:</p>
                      {match.partners.map((p: any, pIdx: number) => (
                        <div key={pIdx} style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                          <span className="text-muted">{p.role}:</span> {p.name}
                          {p.phone && <span style={{ color: 'var(--primary)', marginLeft: '0.5rem' }}>📞 {p.phone}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setParsedMatches([])} style={{ marginRight: '1rem' }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSaveMatches} disabled={loading}>
              Confirmar y Guardar Partidos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
