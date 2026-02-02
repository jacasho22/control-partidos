'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link href="/" className="logo">
          🏀 Control<span>Partidos</span>
        </Link>
        
        <div className="nav-links">
          {session ? (
            <>
              <Link href="/dashboard" className="nav-item">Dashboard</Link>
              <Link href="/matches" className="nav-item">Partidos</Link>
              <Link href="/upload" className="nav-item">Subir</Link>
              <Link href="/statistics" className="nav-item">Stats</Link>
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
