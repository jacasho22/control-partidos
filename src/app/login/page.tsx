'use client';

import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({ licenseNumber: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    if (searchParams.get('registered')) {
      // Use a small timeout to avoid immediate state update during render if strictly enforced
      // OR just set it. Next.js usually handles this okay in effects, but let's be safe.
      const timer = setTimeout(() => {
          setSuccess('¡Registro completado! Ya puedes iniciar sesión.');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await signIn('credentials', {
        redirect: false,
        licenseNumber: formData.licenseNumber,
        password: formData.password,
      });

      if (result?.error) {
        setError('Licencia o contraseña incorrectas');
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <h1 className="text-center mb-4">Iniciar Sesión</h1>

      {success && <div className="card" style={{ background: '#dcfce7', color: 'var(--success)', padding: '0.75rem', marginBottom: '1rem' }}>{success}</div>}
      {error && <div className="card" style={{ background: '#fee2e2', color: 'var(--error)', padding: '0.75rem', marginBottom: '1rem' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Número de Licencia</label>
          <input
            type="text"
            required
            value={formData.licenseNumber}
            onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
            placeholder="Introduce tu licencia"
          />
        </div>

        <div className="form-group">
          <label>Contraseña</label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="********"
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Cargando...' : 'Entrar'}
        </button>
      </form>

      <p className="text-center mt-4">
        ¿Eres nuevo? <Link href="/register" style={{ color: 'var(--primary)' }}>Crea una cuenta</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center p-4">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
