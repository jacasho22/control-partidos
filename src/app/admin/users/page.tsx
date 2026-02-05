'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  licenseNumber: string;
  name: string;
  role: string;
  refereeType: string;
  createdAt: string;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if ((session?.user as any)?.role !== 'ADMIN') {
        router.push('/');
      } else {
        fetchUsers();
      }
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario ${name}? Envía todos sus datos a la basura.`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        alert('Usuario eliminado');
      } else {
        alert(data.message || 'Error al eliminar');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando usuarios...</div>;

  return (
    <div className="container">
      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Gestión de Usuarios</h1>
        <button onClick={() => router.push('/admin')} className="btn" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          Volver
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Licencia</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Nombre</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tipo</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Rol</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem' }}>{user.licenseNumber}</td>
                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{user.name}</td>
                <td style={{ padding: '0.75rem' }}>{user.refereeType}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    background: user.role === 'ADMIN' ? '#dbeafe' : '#f1f5f9',
                    color: user.role === 'ADMIN' ? '#1e40af' : '#475569',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  {user.role !== 'ADMIN' && (
                    <button 
                      onClick={() => handleDelete(user.id, user.name)}
                      style={{ 
                        background: '#fee2e2', 
                        color: '#b91c1c', 
                        border: 'none', 
                        padding: '0.3rem 0.6rem', 
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
