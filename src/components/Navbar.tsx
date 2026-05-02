'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/" className="logo">
          <Image 
            src="/logo_fbcv.png" 
            alt="FBCV Logo" 
            width={100} 
            height={38} 
            priority
            style={{ width: 'auto', height: '38px' }} 
          />
        </Link>
        
        <div className="nav-links">
          {session ? (
            <>
              <Link href="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>Dashboard</Link>
              <Link href="/matches" className={`nav-item ${isActive('/matches')}`}>Partidos</Link>
              <Link href="/partners" className={`nav-item ${isActive('/partners')}`}>Compañeros</Link>
              <Link href="/statistics" className={`nav-item ${isActive('/statistics')}`}>Estadísticas</Link>
              <Link href="/upload" className={`nav-item ${isActive('/upload')}`}>Subir</Link>
              <Link href="/settings" className={`nav-item ${isActive('/settings')}`}>Ajustes</Link>
              {session.user?.role === 'ADMIN' && (
                <Link href="/admin" className="admin-link">Admin</Link>
              )}
            </>
          ) : (
            <>
              <Link href="/login" className={`nav-item ${isActive('/login')}`}>Entrar</Link>
              <Link href="/register" className="btn btn-primary nav-btn-signup">Registro</Link>
            </>
          )}
        </div>

        {session && (
          <div className="user-menu">
            <button onClick={() => signOut()} className="signout-btn">Cerrar Sesión</button>
          </div>
        )}

        {/* Mobile bottom navigation bar icons (Visual only for now, mapped in CSS) */}
        {session && (
          <div className="nav-links mobile-only">
             <Link href="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>🏠</Link>
             <Link href="/matches" className={`nav-item ${isActive('/matches')}`}>🏀</Link>
             <Link href="/upload" className={`nav-item ${isActive('/upload')}`}>📁</Link>
             <Link href="/settings" className={`nav-item ${isActive('/settings')}`}>⚙️</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

// Estos estilos se moverán a globals.css para mejor manejo de media queries
