import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Wine, Package, ArrowLeftRight, FlaskConical, TrendingUp, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  lots: {
    active_lots: string;
    bottled_lots: string;
    total_volume: string;
    vintages_count: string;
  };
  containers: {
    total: string;
    in_use: string;
    available: string;
    in_maintenance: string;
  };
  movements_30d: {
    count: string;
    total_volume: string;
  };
  operations: {
    planned: string;
    in_progress: string;
  };
}

const WINE_COLORS = {
  rouge: '#be185d',
  blanc: '#d4a017',
  rose: '#f9a8d4',
  petillant: '#93c5fd',
  mousseux: '#a78bfa',
  autre: '#6b7280'
};

const TYPE_LABELS: Record<string, string> = {
  rouge: 'Rouge',
  blanc: 'Blanc',
  rose: 'Rosé',
  petillant: 'Pétillant',
  mousseux: 'Mousseux',
  muté: 'Muté',
  autre: 'Autre'
};

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api<DashboardStats>('/dashboard/stats'),
    refetchInterval: 30000
  });

  const { data: lotsByType = [] } = useQuery({
    queryKey: ['lots-by-type'],
    queryFn: () => api<Array<{type: string; count: string; total_volume: string}>>('/dashboard/lots-by-type'),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => api<{movements: any[]; operations: any[]}>('/dashboard/recent-activity'),
  });

  const { data: volumeChart = [] } = useQuery({
    queryKey: ['volume-chart'],
    queryFn: () => api<Array<{day: string; volume_in: string; volume_out: string}>>('/dashboard/volume-chart'),
  });

  const statCards = [
    {
      icon: Wine,
      label: 'Lots actifs',
      value: stats?.lots.active_lots || '0',
      sub: `${Math.round(Number(stats?.lots.total_volume || 0)).toLocaleString('fr')} L total`,
      color: 'text-bordeaux-400'
    },
    {
      icon: Package,
      label: 'Contenants',
      value: stats?.containers.in_use || '0',
      sub: `${stats?.containers.available || '0'} disponibles`,
      color: 'text-gold-400'
    },
    {
      icon: ArrowLeftRight,
      label: 'Mouvements (30j)',
      value: stats?.movements_30d.count || '0',
      sub: `${Math.round(Number(stats?.movements_30d.total_volume || 0)).toLocaleString('fr')} L`,
      color: 'text-blue-400'
    },
    {
      icon: Activity,
      label: 'Opérations actives',
      value: stats?.operations.in_progress || '0',
      sub: `${stats?.operations.planned || '0'} planifiées`,
      color: 'text-green-400'
    }
  ];

  const pieData = lotsByType.map(item => ({
    name: TYPE_LABELS[item.type] || item.type,
    value: Math.round(Number(item.total_volume)),
    color: WINE_COLORS[item.type as keyof typeof WINE_COLORS] || '#6b7280'
  }));

  const chartData = volumeChart.map(d => ({
    day: new Date(d.day).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
    'Entrée': Math.round(Number(d.volume_in)),
    'Sortie': Math.round(Number(d.volume_out))
  }));

  const MOVEMENT_LABELS: Record<string, string> = {
    entree: 'Entrée', sortie: 'Sortie', transfert: 'Transfert',
    assemblage: 'Assemblage', soutirage: 'Soutirage', filtration: 'Filtration',
    collage: 'Collage', perte: 'Perte', bottling: 'Mise en bouteille'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f5e6ea]">Tableau de bord</h1>
        <p className="text-[#c4a0aa] text-sm mt-1">Vue d'ensemble de la cuverie</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <Icon className={color} size={20} />
              <span className="text-2xl font-bold text-[#f5e6ea]">{value}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-[#f5e6ea]">{label}</p>
              <p className="text-xs text-[#c4a0aa] mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Volume chart */}
        <div className="card xl:col-span-2">
          <h2 className="text-sm font-semibold text-[#f5e6ea] mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-bordeaux-400" />
            Volumes 30 derniers jours (L)
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="day" tick={{ fill: '#c4a0aa', fontSize: 10 }} />
                <YAxis tick={{ fill: '#c4a0aa', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#1a0f11', border: '1px solid #3d1f2a', borderRadius: 8 }}
                  labelStyle={{ color: '#f5e6ea' }}
                />
                <Bar dataKey="Entrée" fill="#be185d" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Sortie" fill="#d4a017" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[#c4a0aa] text-sm">
              Aucune donnée disponible
            </div>
          )}
        </div>

        {/* Lots by type */}
        <div className="card">
          <h2 className="text-sm font-semibold text-[#f5e6ea] mb-4 flex items-center gap-2">
            <Wine size={16} className="text-bordeaux-400" />
            Répartition par type
          </h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    dataKey="value" nameKey="name">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1a0f11', border: '1px solid #3d1f2a', borderRadius: 8 }}
                    formatter={(v: number) => [`${v.toLocaleString('fr')} L`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-[#c4a0aa]">{item.name}</span>
                    </div>
                    <span className="text-[#f5e6ea] font-medium">{item.value.toLocaleString('fr')} L</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-[#c4a0aa] text-sm">
              Aucun lot actif
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-sm font-semibold text-[#f5e6ea] mb-4 flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-bordeaux-400" />
            Derniers mouvements
          </h2>
          {recentActivity?.movements.length === 0 && (
            <p className="text-[#c4a0aa] text-sm text-center py-4">Aucun mouvement</p>
          )}
          <div className="space-y-2">
            {recentActivity?.movements.slice(0, 6).map((m: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#2a1520] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-bordeaux-500" />
                  <div>
                    <p className="text-xs font-medium text-[#f5e6ea]">
                      {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      {m.lot_number && ` · ${m.lot_number}`}
                    </p>
                    <p className="text-xs text-[#c4a0aa]">{m.operator_name || 'Système'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-[#f5e6ea]">{Number(m.volume_liters).toLocaleString('fr')} L</p>
                  <p className="text-xs text-[#c4a0aa]">
                    {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-[#f5e6ea] mb-4 flex items-center gap-2">
            <Activity size={16} className="text-bordeaux-400" />
            Opérations récentes
          </h2>
          {recentActivity?.operations.length === 0 && (
            <p className="text-[#c4a0aa] text-sm text-center py-4">Aucune opération</p>
          )}
          <div className="space-y-2">
            {recentActivity?.operations.slice(0, 6).map((o: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#2a1520] last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${o.status === 'done' ? 'bg-green-500' : o.status === 'in_progress' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                  <div>
                    <p className="text-xs font-medium text-[#f5e6ea] capitalize">
                      {o.operation_type.replace(/_/g, ' ')}
                      {o.lot_number && ` · ${o.lot_number}`}
                    </p>
                    <p className="text-xs text-[#c4a0aa] line-clamp-1">{o.purpose}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  o.status === 'done' ? 'badge-active' :
                  o.status === 'in_progress' ? 'badge-warning' : 'badge-bottled'
                }`}>
                  {o.status === 'done' ? 'Terminé' : o.status === 'in_progress' ? 'En cours' : 'Planifié'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
