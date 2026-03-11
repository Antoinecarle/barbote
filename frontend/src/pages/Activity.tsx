import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Activity, ArrowLeftRight, FlaskConical, Filter, RefreshCw } from 'lucide-react';

const MOVEMENT_LABELS: Record<string, string> = {
  entree: 'Entrée', sortie: 'Sortie', transfert: 'Transfert',
  assemblage: 'Assemblage', soutirage: 'Soutirage', filtration: 'Filtration',
  perte: 'Perte', bottling: 'Mise en bouteille'
};

const EVENT_TYPE_CONFIG: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  movement:  {
    bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE',
    icon: <ArrowLeftRight size={14} />
  },
  operation: {
    bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0',
    icon: <FlaskConical size={14} />
  },
};

function getInitials(name: string): string {
  if (!name || name === 'Système') return 'SY';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return 'Hier';
  if (diffD < 7) return `Il y a ${diffD} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export default function ActivityPage() {
  const [filterType, setFilterType] = useState<'all' | 'movement' | 'operation'>('all');

  const { data: activity, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api<any>('/dashboard/recent-activity'),
    refetchInterval: 15000,
  });

  const allEvents: any[] = [
    ...(activity?.movements || []).map((m: any) => ({
      ...m,
      event_type: 'movement',
      date: m.date,
      title: `${MOVEMENT_LABELS[m.movement_type] || m.movement_type}`,
      subtitle: `${m.lot_number || '—'} · ${Number(m.volume_liters || 0).toLocaleString('fr')} L`,
      actor: m.operator_name || 'Système',
      entity: m.lot_number,
    })),
    ...(activity?.operations || []).map((o: any) => ({
      ...o,
      event_type: 'operation',
      date: o.date,
      title: `${o.operation_type?.replace(/_/g, ' ')}`,
      subtitle: o.purpose || o.lot_number || '—',
      actor: o.operator_name || 'Système',
      entity: o.lot_number,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = filterType === 'all'
    ? allEvents
    : allEvents.filter(e => e.event_type === filterType);

  // Group by day
  const grouped: Record<string, any[]> = {};
  filtered.forEach(e => {
    const day = new Date(e.date).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(e);
  });

  const dayKeys = Object.keys(grouped);

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-bold text-[#1A1714] tracking-tight flex items-center gap-2"
              style={{ fontFamily: "'Cabinet Grotesk', 'Satoshi', sans-serif" }}
            >
              <Activity size={22} className="text-[#8B1A2F]" />
              Activité
            </h1>
            <p className="text-sm text-[#5C5550] mt-1">
              Historique des actions cave · {filtered.length} événement{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#5C5550] bg-white border border-[#E8E4DE] hover:bg-[#F9F8F6] shadow-sm transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-white border border-[#E8E4DE] rounded-lg p-1 shadow-sm w-fit">
          {([
            { key: 'all', label: 'Tout', count: allEvents.length },
            { key: 'movement', label: 'Mouvements', count: allEvents.filter(e => e.event_type === 'movement').length },
            { key: 'operation', label: 'Opérations', count: allEvents.filter(e => e.event_type === 'operation').length },
          ] as { key: 'all' | 'movement' | 'operation'; label: string; count: number }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                filterType === tab.key
                  ? 'bg-[#8B1A2F] text-white shadow-sm'
                  : 'text-[#5C5550] hover:text-[#1A1714] hover:bg-[#F0EDE8]'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                filterType === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-[#F0EDE8] text-[#5C5550]'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Activity feed */}
        <div className="bg-white border border-[#E8E4DE] rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-[#F0EDE8] shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-[#F0EDE8] rounded w-1/2" />
                    <div className="h-3 bg-[#F0EDE8] rounded w-1/3" />
                  </div>
                  <div className="h-3 w-16 bg-[#F0EDE8] rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex flex-col items-center gap-3 text-[#9B9590]">
                <div className="w-12 h-12 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                  <Activity size={22} />
                </div>
                <p className="text-sm font-medium text-[#5C5550]">Aucune activité récente</p>
                <p className="text-xs text-[#9B9590]">Les mouvements et opérations apparaîtront ici</p>
              </div>
            </div>
          ) : (
            <div>
              {dayKeys.map((day, dayIndex) => (
                <div key={day}>
                  {/* Day separator */}
                  <div className="flex items-center gap-3 px-6 py-3 bg-[#F9F8F6] border-b border-[#E8E4DE]">
                    <div className="h-px flex-1 bg-[#E8E4DE]" />
                    <span className="text-xs font-semibold text-[#5C5550] capitalize whitespace-nowrap">
                      {day}
                    </span>
                    <div className="h-px flex-1 bg-[#E8E4DE]" />
                  </div>

                  {/* Events for that day */}
                  <div className="divide-y divide-[#E8E4DE]">
                    {grouped[day].map((event, i) => {
                      const typeConf = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.movement;
                      const initials = getInitials(event.actor);
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-4 px-6 py-4 hover:bg-[#F9F8F6] transition-colors duration-100"
                        >
                          {/* Avatar */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                            style={{
                              backgroundColor: event.actor === 'Système' ? '#F0EDE8' : '#FDF2F4',
                              color: event.actor === 'Système' ? '#5C5550' : '#8B1A2F',
                            }}
                            title={event.actor}
                          >
                            {initials}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                                style={{ backgroundColor: typeConf.bg, color: typeConf.text, borderColor: typeConf.border }}
                              >
                                {typeConf.icon}
                                {event.event_type === 'movement' ? 'Mouvement' : 'Opération'}
                              </span>
                              <span className="text-sm font-semibold text-[#1A1714] capitalize">
                                {event.title}
                              </span>
                            </div>
                            <p className="text-xs text-[#5C5550] mt-0.5 truncate">{event.subtitle}</p>
                            <p className="text-xs text-[#9B9590] mt-0.5">
                              Par <span className="font-medium text-[#5C5550]">{event.actor}</span>
                            </p>
                          </div>

                          {/* Time */}
                          <div className="text-right shrink-0">
                            <p className="text-xs text-[#9B9590] whitespace-nowrap">
                              {formatRelativeDate(event.date)}
                            </p>
                            <p className="text-xs text-[#9B9590] mt-0.5" style={{ opacity: 0.7 }}>
                              {new Date(event.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Footer */}
              <div className="px-6 py-4 bg-[#F9F8F6] border-t border-[#E8E4DE] text-center">
                <p className="text-xs text-[#9B9590]">
                  Affichage des {filtered.length} dernière{filtered.length !== 1 ? 's' : ''} activité{filtered.length !== 1 ? 's' : ''} · Actualisation automatique toutes les 15 sec
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
