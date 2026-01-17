'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    licenseNumber: '',
    name: '',
    password: '',
    confirmPassword: '',
    refereeType: 'PISTA',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/login?registered=true');
      } else {
        const data = await res.json();
        setError(data.message || 'Error al registrarse');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h1 className="text-center mb-4">Registro Árbitro</h1>
      
      {error && <div className="card" style={{ background: '#fee2e2', color: 'var(--error)', padding: '0.75rem', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Número de Licencia</label>
          <input
            type="text"
            required
            value={formData.licenseNumber}
            onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
            placeholder="Ej: 31781"
          />
        </div>

        <div className="form-group">
          <label>Nombre Completo</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nombre y Apellidos"
          />
        </div>

        <div className="form-group">
          <label>Tipo de Árbitro</label>
          <select
            value={formData.refereeType}
            onChange={(e) => setFormData({ ...formData, refereeType: e.target.value })}
          >
            <option value="PISTA">Árbitro de Pista</option>
            <option value="MESA">Árbitro de Mesa (Oficial)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Contraseña</label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Confirmar Contraseña</label>
          <input
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Registrando...' : 'Registrarse'}
        </button>
      </form>

      <p className="text-center mt-4">
        ¿Ya tienes cuenta? <Link href="/login" style={{ color: 'var(--primary)' }}>Inicia sesión</Link>
      </p>
    </div>
  );
}
