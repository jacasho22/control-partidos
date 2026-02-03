'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link href="/" className="logo" style={{ display: 'flex', alignItems: 'center', padding: '5px 0' }}>
          <Image 
            src="/logo_fbcv.png" 
            alt="FBCV Logo" 
            width={120} 
            height={45} 
            priority
            style={{ width: 'auto', height: '45px' }} 
          />
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
