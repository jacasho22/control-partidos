'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link href="/" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img 
            src="/fbcv-logo.png" 
            alt="FBCV" 
            style={{ height: '40px', width: 'auto' }}
            onError={(e) => (e.currentTarget.style.display = 'none')} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: '1rem' }}>Control</span>
            <span style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>Partidos</span>
          </div>
        </Link>
        
        <div className="nav-links">
          {session ? (
            <>
              <Link href="/dashboard" className="nav-item">Dashboard</Link>
              <Link href="/matches" className="nav-item">Partidos</Link>
              <Link href="/partners" className="nav-item">Compañeros</Link>
              <Link href="/statistics" className="nav-item">Estadísticas</Link>
              <Link href="/upload" className="nav-item">Subir</Link>
              <Link href="/settings" className="nav-item">Ajustes</Link>
              {session.user?.role === 'ADMIN' && (
                <Link href="/admin" className="admin-link">Admin</Link>
              )}
              <div className="user-menu">
                <button onClick={() => signOut()} className="signout-btn">Salir</button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-item">Entrar</Link>
              <Link href="/register" className="btn btn-primary nav-btn-signup">Registro</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// Estos estilos se moverán a globals.css para mejor manejo de media queries
