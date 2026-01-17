'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Navbar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav style={navStyle}>
      <div className="container" style={navContainerStyle}>
        <Link href="/" style={logoStyle}>
          🏀 Control<span>Partidos</span>
        </Link>
        
        <div style={navLinksStyle}>
          {session ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/matches">Mis Partidos</Link>
              <Link href="/upload">Subir PDF</Link>
              <Link href="/statistics">Estadísticas</Link>
              {session.user?.role === 'ADMIN' && (
                <Link href="/admin" style={adminLinkStyle}>Admin</Link>
              )}
              <div style={userMenuStyle}>
                <span>{session.user?.name}</span>
                <button onClick={() => signOut()} style={signOutBtnStyle}>Salir</button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login">Entrar</Link>
              <Link href="/register" className="btn btn-primary" style={{color: 'white'}}>Registrarse</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  background: 'var(--white)',
  borderBottom: '1px solid var(--border)',
  position: 'sticky',
  top: 0,
  zIndex: 100,
};

const navContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem',
};

const logoStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  color: 'var(--primary)',
};

const navLinksStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.5rem',
  alignItems: 'center',
};

const userMenuStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  marginLeft: '1rem',
  paddingLeft: '1rem',
  borderLeft: '1px solid var(--border)',
};

const signOutBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--error)',
  fontSize: '0.9rem',
};

const adminLinkStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontWeight: 'bold',
  border: '1px solid var(--border)',
  padding: '0.25rem 0.5rem',
  borderRadius: '4px',
};
