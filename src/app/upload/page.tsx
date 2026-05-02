'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Partner {
  name: string;
  role: string;
  phone?: string;
}

interface ParsedMatch {
  date: string;
  time: string;
  matchNumber: string;
  localTeam: string;
  visitorTeam: string;
  category: string;
  division: string;
  venue: string;
  role: string;
  partners: Partner[];
}

export default function UploadPage() {
  useSession();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedMatches, setParsedMatches] = useState<ParsedMatch[]>([]);

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
    } catch (err) {
      const errorObj = err as Error;
      console.error('Fetch error:', errorObj);
      setError(`Error de conexión al servidor: ${errorObj.message || 'Error desconocido'}`);
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
    } catch (err) {
      const errorObj = err as Error;
      console.error('Save error:', errorObj);
      setError(`Error de red al guardar: ${errorObj.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '4rem' }}>
      <h1 className="mb-4" style={{ textAlign: 'center' }}>Subir Designaciones</h1>
      <p className="text-muted mb-4" style={{ textAlign: 'center', fontSize: '1.1rem' }}>
        Arrastra o selecciona los PDFs de tus designaciones para extraer los partidos automáticamente.
      </p>

      <div className="card" style={{ padding: '2rem', border: '2px dashed var(--border-dark)', background: '#f8fafc', textAlign: 'center' }}>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '3rem' }}>📄</span>
            </div>
            <label style={{ fontSize: '1rem', marginBottom: '1rem' }}>Selecciona tus archivos PDF</label>
            <input 
              type="file" 
              accept=".pdf" 
              multiple 
              onChange={handleFileChange} 
              style={{ 
                background: 'white', 
                padding: '1.5rem', 
                border: '1px solid var(--border-dark)',
                cursor: 'pointer'
              }} 
            />
            {files.length > 0 && (
              <p style={{ marginTop: '1rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)' }}>
                ✨ {files.length} archivo{files.length > 1 ? 's' : ''} listo{files.length > 1 ? 's' : ''} para analizar
              </p>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={files.length === 0 || loading}>
            {loading ? 'Procesando archivos...' : `Analizar PDF${files.length > 1 ? 's' : ''}`}
          </button>
        </form>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: 'var(--error)', marginTop: '1.5rem', fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      {parsedMatches.length > 0 && (
        <div className="mt-4">
          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>Partidos detectados ({parsedMatches.length})</h2>
            <button className="btn" onClick={() => setParsedMatches([])} style={{ background: '#f1f5f9' }}>Limpiar</button>
          </div>
          
          <div className="grid">
            {parsedMatches.map((match, idx) => (
              <div key={idx} className="card" style={{ padding: '1.25rem' }}>
                <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.9rem' }}>{match.date} · {match.time}</span>
                  <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>#{match.matchNumber}</span>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{match.localTeam} <span style={{color:'#cbd5e1', fontSize:'0.8rem'}}>VS</span> {match.visitorTeam}</p>
                  <p className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{match.category} · {match.division}</p>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#475569', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                  <p style={{ marginBottom: '0.25rem' }}>📍 {match.venue}</p>
                  <p>👤 {match.role}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ 
            marginTop: '2rem', 
            position: 'sticky', 
            bottom: '2rem', 
            background: 'white', 
            padding: '1.5rem', 
            borderRadius: '16px', 
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
            border: '1px solid var(--border-dark)',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <button className="btn btn-primary" onClick={handleSaveMatches} disabled={loading} style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
              {loading ? 'Guardando...' : 'Confirmar y Guardar Todo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
