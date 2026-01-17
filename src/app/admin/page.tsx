'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if ((session.user as any).role !== 'ADMIN') {
        router.push('/dashboard');
      } else {
        fetch('/api/admin/users')
          .then(res => res.json())
          .then(data => {
            setUsers(data.users);
            setLoading(false);
          });
      }
    }
  }, [status, session, router]);

  if (loading) return <div className="text-center mt-4">Cargando usuarios...</div>;

  return (
    <div>
      <h1 className="mb-4">Panel de Administración</h1>
      
      <div className="card">
        <h3>Gestión de Usuarios</h3>
        <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Licencia</th>
                <th style={{ padding: '0.75rem' }}>Nombre</th>
                <th style={{ padding: '0.75rem' }}>Tipo</th>
                <th style={{ padding: '0.75rem' }}>Rol</th>
                <th style={{ padding: '0.75rem' }}>Partidos</th>
                <th style={{ padding: '0.75rem' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}>{user.licenseNumber}</td>
                  <td style={{ padding: '0.75rem' }}>{user.name}</td>
                  <td style={{ padding: '0.75rem' }}>{user.refereeType}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem',
                      background: user.role === 'ADMIN' ? '#dcfce7' : '#f1f5f9',
                      color: user.role === 'ADMIN' ? '#166534' : '#475569'
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{user._count.matches}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button className="btn" style={{ fontSize: '0.8rem', marginRight: '0.5rem' }}>Editar</button>
                    {user.licenseNumber !== 'ADMIN' && (
                      <button className="btn" style={{ fontSize: '0.8rem', color: 'var(--error)' }}>Bloquear</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
