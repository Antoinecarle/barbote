import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Activity } from 'lucide-react';

const MOVEMENT_LABELS: Record<string, string> = {
  entree: 'Entrée', sortie: 'Sortie', transfert: 'Transfert',
  assemblage: 'Assemblage', soutirage: 'Soutirage', filtration: 'Filtration',
  perte: 'Perte', bottling: 'Mise en bouteille'
};

export default function ActivityPage() {
  const { data: activity } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api<any>('/dashboard/recent-activity'),
    refetchInterval: 15000
  });

  const allEvents: any[] = [
    ...(activity?.movements || []).map((m: any) => ({
      ...m, event_type: 'movement', date: m.date,
      title: `${MOVEMENT_LABELS[m.movement_type] || m.movement_type}: ${m.lot_number || '—'}`,
      subtitle: `${Number(m.volume_liters || 0).toLocaleString('fr')} L · ${m.operator_name || 'Système'}`,
      color: '#3b82f6'
    })),
    ...(activity?.operations || []).map((o: any) => ({
      ...o, event_type: 'operation', date: o.date,
      title: `${o.operation_type.replace(/_/g, ' ')}: ${o.lot_number || '—'}`,
      subtitle: o.purpose,
      color: '#22c55e'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[#f5e6ea] flex items-center gap-2">
          <Activity size={24} className="text-blue-400" />
          Journal d'activité
        </h1>
        <p className="text-[#c4a0aa] text-sm mt-1">Historique des actions cave</p>
      </div>

      <div className="card">
        {allEvents.length === 0 ? (
          <div className="text-center py-12 text-[#c4a0aa]">
            <Activity size={32} className="mx-auto mb-2 opacity-30" />
            Aucune activité récente
          </div>
        ) : (
          <div className="space-y-3">
            {allEvents.map((event, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-[#2a1520] last:border-0">
                <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: event.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f5e6ea] capitalize">{event.title}</p>
                  <p className="text-xs text-[#c4a0aa] truncate">{event.subtitle}</p>
                </div>
                <p className="text-xs text-[#c4a0aa] shrink-0">
                  {new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
