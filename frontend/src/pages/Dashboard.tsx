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
  rouge: '#8B1A2F',
  blanc: '#D97706',
  rose: '#DB2777',
  petillant: '#1D4ED8',
  mousseux: '#7C3AED',
  autre: '#6B7280'
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

const MOVEMENT_LABELS: Record<string, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  transfert: 'Transfert',
  assemblage: 'Assemblage',
  soutirage: 'Soutirage',
  filtration: 'Filtration',
  collage: 'Collage',
  perte: 'Perte',
  bottling: 'Mise en bouteille'
};

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  iconBg: string;
  iconColor: string;
  accentColor: string;
}

function KpiCard({ icon: Icon, label, value, sub, iconBg, iconColor, accentColor }: KpiCardProps) {
  return (
    <div
      className="bg-white border border-[#E8E4DE] rounded-xl p-5 transition-shadow duration-200 hover:shadow-md cursor-default overflow-hidden relative"
      style={{
        boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)'
      }}
    >
      {/* Top colored accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex items-center justify-between mb-3 mt-1">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={20} style={{ color: iconColor }} />
        </div>
      </div>
      <div>
        <p
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: '#1A1714', fontFamily: "'Cabinet Grotesk', sans-serif" }}
        >
          {value}
        </p>
        <p className="text-sm font-medium mt-1" style={{ color: '#5C5550' }}>{label}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: '#9B9590' }}>{sub}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div
      className="bg-white border border-[#E8E4DE] rounded-xl p-5 transition-shadow duration-200 hover:shadow-md"
      style={{
        boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)'
      }}
    >
      <h2
        className="text-sm font-semibold mb-4 flex items-center gap-2"
        style={{ color: '#1A1714', fontFamily: "'Cabinet Grotesk', sans-serif" }}
      >
        <Icon size={16} style={{ color: '#8B1A2F' }} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-sm" style={{ color: '#9B9590' }}>
      {message}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api<DashboardStats>('/dashboard/stats'),
    refetchInterval: 30000
  });

  const { data: lotsByType = [] } = useQuery({
    queryKey: ['lots-by-type'],
    queryFn: () => api<Array<{ type: string; count: string; total_volume: string }>>('/dashboard/lots-by-type'),
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => api<{ movements: any[]; operations: any[] }>('/dashboard/recent-activity'),
  });

  const { data: volumeChart = [] } = useQuery({
    queryKey: ['volume-chart'],
    queryFn: () => api<Array<{ day: string; volume_in: string; volume_out: string }>>('/dashboard/volume-chart'),
  });

  const kpiCards: KpiCardProps[] = [
    {
      icon: Wine,
      label: 'Lots actifs',
      value: stats?.lots.active_lots ?? '0',
      sub: `${Math.round(Number(stats?.lots.total_volume ?? 0)).toLocaleString('fr')} L total`,
      iconBg: '#FDF2F4',
      iconColor: '#8B1A2F',
      accentColor: '#8B1A2F'
    },
    {
      icon: Package,
      label: 'Contenants',
      value: stats?.containers.in_use ?? '0',
      sub: `${stats?.containers.available ?? '0'} disponibles`,
      iconBg: '#FFFBEB',
      iconColor: '#D97706',
      accentColor: '#D97706'
    },
    {
      icon: ArrowLeftRight,
      label: 'Mouvements 30j',
      value: stats?.movements_30d.count ?? '0',
      sub: `${Math.round(Number(stats?.movements_30d.total_volume ?? 0)).toLocaleString('fr')} L`,
      iconBg: '#EFF6FF',
      iconColor: '#1D4ED8',
      accentColor: '#1D4ED8'
    },
    {
      icon: Activity,
      label: 'Opérations actives',
      value: stats?.operations.in_progress ?? '0',
      sub: `${stats?.operations.planned ?? '0'} planifiées`,
      iconBg: '#F0FDF4',
      iconColor: '#16A34A',
      accentColor: '#16A34A'
    }
  ];

  const pieData = lotsByType.map(item => ({
    name: TYPE_LABELS[item.type] || item.type,
    value: Math.round(Number(item.total_volume)),
    color: WINE_COLORS[item.type as keyof typeof WINE_COLORS] || '#6B7280'
  }));

  const chartData = volumeChart.map(d => ({
    day: new Date(d.day).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
    'Entrée': Math.round(Number(d.volume_in)),
    'Sortie': Math.round(Number(d.volume_out))
  }));

  return (
    <div className="space-y-5">
      {/* Page header — flex-wrap so buttons don't overflow on small screens */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight"
            style={{ color: '#1A1714', fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Tableau de bord
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9B9590' }}>Vue d'ensemble de votre cave</p>
        </div>
      </div>

      {/* KPI cards — 1 col mobile, 2 col sm, 4 col xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* Charts row — stack on mobile, side-by-side on xl */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Bar chart – volume movements — scrollable wrapper on mobile */}
        <SectionCard title="Volume des mouvements (30j)" icon={TrendingUp}>
          {chartData.length > 0 ? (
            <div className="overflow-x-auto -mx-1">
              <div className="min-w-[280px]">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#9B9590', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#9B9590', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#FDFCFA',
                        border: '1px solid #E8E4DE',
                        borderRadius: 8,
                        fontSize: 12,
                        color: '#1A1714'
                      }}
                      labelStyle={{ color: '#5C5550', fontWeight: 600 }}
                    />
                    <Bar dataKey="Entrée" fill="#8B1A2F" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Sortie" fill="#D97706" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyState message="Aucune donnée disponible" />
          )}
        </SectionCard>

        {/* Pie chart – lots by type */}
        <SectionCard title="Répartition par type" icon={Wine}>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    nameKey="name"
                    strokeWidth={2}
                    stroke="#FDFCFA"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#FDFCFA',
                      border: '1px solid #E8E4DE',
                      borderRadius: 8,
                      fontSize: 12,
                      color: '#1A1714'
                    }}
                    formatter={(v: number) => [`${v.toLocaleString('fr')} L`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {pieData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate" style={{ color: '#5C5550' }}>{item.name}</span>
                    </div>
                    <span className="font-medium ml-2 flex-shrink-0" style={{ color: '#1A1714' }}>{item.value.toLocaleString('fr')} L</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState message="Aucun lot actif" />
          )}
        </SectionCard>
      </div>

      {/* Recent activity row — stack on mobile */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Recent movements */}
        <SectionCard title="Mouvements récents" icon={ArrowLeftRight}>
          {(!recentActivity?.movements || recentActivity.movements.length === 0) ? (
            <p className="text-sm text-center py-6" style={{ color: '#9B9590' }}>Aucun mouvement récent</p>
          ) : (
            <div className="divide-y" style={{ borderColor: '#EDE9E3' }}>
              {recentActivity.movements.slice(0, 6).map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#8B1A2F' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#1A1714' }}>
                        {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                        {m.lot_number && (
                          <span className="font-normal" style={{ color: '#9B9590' }}> · {m.lot_number}</span>
                        )}
                      </p>
                      <p className="text-xs" style={{ color: '#9B9590' }}>{m.operator_name || 'Système'}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium" style={{ color: '#1A1714' }}>
                      {Number(m.volume_liters).toLocaleString('fr')} L
                    </p>
                    <p className="text-xs" style={{ color: '#9B9590' }}>
                      {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent operations */}
        <SectionCard title="Opérations récentes" icon={Activity}>
          {(!recentActivity?.operations || recentActivity.operations.length === 0) ? (
            <p className="text-sm text-center py-6" style={{ color: '#9B9590' }}>Aucune opération récente</p>
          ) : (
            <div className="divide-y" style={{ borderColor: '#EDE9E3' }}>
              {recentActivity.operations.slice(0, 6).map((o: any, i: number) => {
                const statusConfig = o.status === 'done'
                  ? { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Terminé' }
                  : o.status === 'in_progress'
                  ? { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label: 'En cours' }
                  : { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'Planifié' };

                const dotColor = o.status === 'done'
                  ? '#16A34A'
                  : o.status === 'in_progress'
                  ? '#D97706'
                  : '#1D4ED8';

                return (
                  <div key={i} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize truncate" style={{ color: '#1A1714' }}>
                          {o.operation_type.replace(/_/g, ' ')}
                          {o.lot_number && (
                            <span className="font-normal" style={{ color: '#9B9590' }}> · {o.lot_number}</span>
                          )}
                        </p>
                        {o.purpose && (
                          <p className="text-xs truncate" style={{ color: '#9B9590' }}>{o.purpose}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{
                        backgroundColor: statusConfig.bg,
                        color: statusConfig.text,
                        border: `1px solid ${statusConfig.border}`
                      }}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
