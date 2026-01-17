import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="text-center" style={{ padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
        Control de Partidos
      </h1>
      <p className="text-muted" style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
        La herramienta definitiva para árbitros. Gestiona tus designaciones, 
        controla tus ingresos y analiza tus estadísticas, todo en un solo lugar.
      </p>

      <div className="flex" style={{ justifyContent: 'center', gap: '1.5rem' }}>
        <Link href="/login" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          Empezar Ahora
        </Link>
        <Link href="/register" className="btn" style={{ padding: '1rem 2rem', fontSize: '1.1rem', border: '1px solid var(--border)' }}>
          Crear Cuenta
        </Link>
      </div>

      <div className="grid mt-4" style={{ marginTop: '5rem' }}>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
          <h3>Parser de PDF</h3>
          <p className="text-muted">Sube tu designación y nosotros extraemos los datos automáticamente.</p>
        </div>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💰</div>
          <h3>Control de Ingresos</h3>
          <p className="text-muted">Registra lo que te pagan por partido y por kilometraje.</p>
        </div>
        <div className="card">
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📈</div>
          <h3>Estadísticas</h3>
          <p className="text-muted">Visualiza cuánto ganas por semana, mes y temporada.</p>
        </div>
      </div>
    </div>
  );
}
