'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import StatisticsChart from '@/components/StatisticsChart';

interface StatItem {
  period: string;
  matches: number;
  fees: number;
  gas: number;
  total: number;
}

interface StatisticsData {
  totalMatch: number;
  totalGas: number;
  categories: Record<string, number>;
  divisions: Record<string, number>;
  detailedCategories: Record<string, number>;
  weekly: StatItem[];
  monthly: StatItem[];
}

export default function StatisticsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const formatWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    return `S. ${d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}`;
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1);
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetch('/api/statistics')
        .then(res => res.json())
        .then(data => {
          setStats(data);
          setLoading(false);
        });
    }
  }, [status, router]);

  if (loading || !stats) return <div className="text-center mt-4">Cargando estadísticas...</div>;

  const categoryData = {
    labels: Object.keys(stats.categories),
    datasets: [
      {
        label: 'Partidos por Categoría',
        data: Object.values(stats.categories),
        backgroundColor: [
          'rgba(37, 99, 235, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(139, 92, 246, 0.6)',
        ],
      },
    ],
  };

  const sortedDetailed = Object.entries(stats.detailedCategories)
    .sort(([, a], [, b]) => b - a);

  // Calculate max value for percentages
  const maxVal = sortedDetailed.length > 0 ? sortedDetailed[0][1] : 0;

  const earningsData = {
    labels: ['Ingresos Partido', 'Ingresos Gasolina'],
    datasets: [
      {
        label: 'Euros (€)',
        data: [stats.totalMatch, stats.totalGas],
        backgroundColor: ['rgba(37, 99, 235, 0.8)', 'rgba(16, 185, 129, 0.8)'],
      },
    ],
  };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <h1 className="mb-4">Estadísticas</h1>
      
      <div className="grid">
        <div className="card">
          <h3>Ingresos Totales</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '1rem 0', color: 'var(--primary)' }}>
            {(stats.totalMatch + stats.totalGas).toFixed(2)}€
          </p>
          <div className="flex" style={{ justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Partidos: {stats.totalMatch.toFixed(2)}€</span>
            <span>Gasolina: {stats.totalGas.toFixed(2)}€</span>
          </div>
        </div>

        <div className="card">
          <h3>Partidos Totales</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '1rem 0' }}>
            {Object.values(stats.categories).reduce((a, b) => a + b, 0)}
          </p>
          <p className="text-muted">Temporada 2024/2025</p>
        </div>
      </div>

      <div className="grid mt-4" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }}>
        <div className="card">
          <h3>Ingresos por Tipo</h3>
          <div style={{ height: '300px', display: 'flex', justifyContent: 'center' }}>
            <StatisticsChart 
              type="bar" 
              data={earningsData} 
              options={{ maintainAspectRatio: false }}
            />
          </div>
        </div>
        
        <div className="card">
          <h3>Top Categorías</h3>
          <div style={{ height: '300px' }}>
            <StatisticsChart 
              type="pie" 
              data={categoryData} 
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
            />
          </div>
        </div>
      </div>

      <div className="grid mt-4">
        <div className="card">
          <h3>Desglose por Liga y Categoría</h3>
          <div style={{ marginTop: '1.5rem' }}>
            {sortedDetailed.map(([name, count]) => {
              const percent = maxVal > 0 ? (count / maxVal) * 100 : 0;
              return (
                <div key={name} style={{ marginBottom: '1.25rem' }}>
                  <div className="flex" style={{ justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text)' }}>
                      {name}
                    </span>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                      {count} partidos
                    </span>
                  </div>
                  <div style={{ 
                    height: '1.5rem', 
                    background: 'var(--bg)', 
                    borderRadius: '999px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${percent}%`, 
                      height: '100%', 
                      background: 'var(--primary)', 
                      borderRadius: '999px',
                      transition: 'width 0.5s ease-out'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid mt-4">
        <div className="card">
          <h3 className="mb-4">Desglose Semanal (Viernes a Viernes)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Semana</th>
                  <th style={{ padding: '0.75rem' }}>Partidos</th>
                  <th style={{ padding: '0.75rem' }}>Tarifa</th>
                  <th style={{ padding: '0.75rem' }}>Gasolina</th>
                  <th style={{ padding: '0.75rem' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.weekly.map((item) => (
                  <tr key={item.period} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem' }}>{formatWeek(item.period)}</td>
                    <td style={{ padding: '0.75rem' }}>{item.matches}</td>
                    <td style={{ padding: '0.75rem' }}>{item.fees.toFixed(2)}€</td>
                    <td style={{ padding: '0.75rem' }}>{item.gas.toFixed(2)}€</td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>{item.total.toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4">Desglose Mensual</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Mes</th>
                  <th style={{ padding: '0.75rem' }}>Partidos</th>
                  <th style={{ padding: '0.75rem' }}>Tarifa</th>
                  <th style={{ padding: '0.75rem' }}>Gasolina</th>
                  <th style={{ padding: '0.75rem' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.monthly.map((item) => (
                  <tr key={item.period} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{formatMonth(item.period)}</td>
                    <td style={{ padding: '0.75rem' }}>{item.matches}</td>
                    <td style={{ padding: '0.75rem' }}>{item.fees.toFixed(2)}€</td>
                    <td style={{ padding: '0.75rem' }}>{item.gas.toFixed(2)}€</td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold', color: 'var(--success)' }}>{item.total.toFixed(2)}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
