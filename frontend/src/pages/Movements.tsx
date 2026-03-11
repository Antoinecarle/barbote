import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ArrowLeftRight, Plus, Filter, Clock, List, X } from 'lucide-react';

const MOVEMENT_LABELS: Record<string, string> = {
  entree: 'Entrée', sortie: 'Sortie', transfert: 'Transfert',
  assemblage: 'Assemblage', soutirage: 'Soutirage', filtration: 'Filtration',
  collage: 'Collage', chaptalisation: 'Chaptalisation', acidification: 'Acidification',
  sulfitage: 'Sulfitage', levurage: 'Levurage', malo: 'FML', perte: 'Perte',
  centrifugation: 'Centrifugation', bottling: 'Mise en bouteille'
};

const MOVEMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  entree:     { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  sortie:     { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  transfert:  { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  assemblage: { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  perte:      { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  bottling:   { bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' },
  default:    { bg: '#F0EDE8', text: '#5C5550', border: '#E8E4DE' },
};

const DOT_COLORS: Record<string, string> = {
  entree: '#16A34A', sortie: '#DC2626', transfert: '#2563EB',
  assemblage: '#7C3AED', perte: '#D97706', bottling: '#0891B2', default: '#9B9590'
};

function MovementBadge({ type }: { type: string }) {
  const colors = MOVEMENT_COLORS[type] || MOVEMENT_COLORS.default;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {MOVEMENT_LABELS[type] || type}
    </span>
  );
}

export default function Movements() {
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const queryClient = useQueryClient();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['movements', filterType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      return api<any[]>(`/movements?${params}`);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['movements-stats'],
    queryFn: () => api<any>('/movements/stats/overview'),
  });

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-bold text-[#1A1714] tracking-tight flex items-center gap-2"
              style={{ fontFamily: "'Cabinet Grotesk', 'Satoshi', sans-serif" }}
            >
              <ArrowLeftRight size={22} className="text-[#8B1A2F]" />
              Mouvements de liquides
            </h1>
            <p className="text-sm text-[#5C5550] mt-1">
              {movements.length} mouvement{movements.length !== 1 ? 's' : ''} chargé{movements.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all duration-200"
            style={{ backgroundColor: '#8B1A2F' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6F1526')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#8B1A2F')}
          >
            <Plus size={16} />
            Nouveau mouvement
          </button>
        </div>

        {/* Stats */}
        {stats?.movement_types?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.movement_types.slice(0, 4).map((mt: any) => {
              const colors = MOVEMENT_COLORS[mt.movement_type] || MOVEMENT_COLORS.default;
              return (
                <div key={mt.movement_type} className="bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: DOT_COLORS[mt.movement_type] || DOT_COLORS.default }}
                    />
                    <p className="text-xs font-medium text-[#5C5550] uppercase tracking-wide">
                      {MOVEMENT_LABELS[mt.movement_type] || mt.movement_type}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-[#1A1714]">{mt.count}</p>
                  <p className="text-xs text-[#5C5550] mt-0.5">
                    {Math.round(Number(mt.total_volume || 0)).toLocaleString('fr')} L total
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters + View toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#9B9590]" />
            <select
              className="bg-white border border-[#E8E4DE] rounded-lg px-3 py-2 text-sm text-[#1A1714] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">Tous les types</option>
              {Object.entries(MOVEMENT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-1 bg-white border border-[#E8E4DE] rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-[#8B1A2F] text-white shadow-sm'
                  : 'text-[#5C5550] hover:text-[#1A1714] hover:bg-[#F0EDE8]'
              }`}
            >
              <List size={14} />
              Tableau
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'timeline'
                  ? 'bg-[#8B1A2F] text-white shadow-sm'
                  : 'text-[#5C5550] hover:text-[#1A1714] hover:bg-[#F0EDE8]'
              }`}
            >
              <Clock size={14} />
              Timeline
            </button>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white border border-[#E8E4DE] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-[#F9F8F6] border-b border-[#E8E4DE]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">De / Vers</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Lot</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Volume</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Raison</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DE]">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-3">
                        <div className="h-4 bg-[#F0EDE8] rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3 text-[#9B9590]">
                        <div className="w-12 h-12 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                          <ArrowLeftRight size={22} />
                        </div>
                        <p className="text-sm font-medium text-[#5C5550]">Aucun mouvement enregistré</p>
                        <p className="text-xs text-[#9B9590]">Commencez par enregistrer un mouvement de liquide</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  movements.map((m: any) => (
                    <tr key={m.id} className="hover:bg-[#F9F8F6] transition-colors duration-100">
                      <td className="px-4 py-3 text-sm text-[#5C5550] whitespace-nowrap">
                        {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <MovementBadge type={m.movement_type} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#5C5550]">
                        {m.from_container_code && (
                          <span className="font-medium text-[#1A1714]">{m.from_container_code}</span>
                        )}
                        {m.from_container_code && m.to_container_code && (
                          <span className="mx-1.5 text-[#9B9590]">→</span>
                        )}
                        {m.to_container_code && (
                          <span className="font-medium text-[#1A1714]">{m.to_container_code}</span>
                        )}
                        {!m.from_container_code && !m.to_container_code && (
                          <span className="text-[#9B9590]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {m.lot_number ? (
                          <div>
                            <p className="text-sm font-medium text-[#1A1714]">{m.lot_number}</p>
                            {m.lot_name && <p className="text-xs text-[#9B9590]">{m.lot_name}</p>}
                          </div>
                        ) : (
                          <span className="text-sm text-[#9B9590]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-[#1A1714]">
                          {Number(m.volume_liters).toLocaleString('fr')} L
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#5C5550] max-w-xs truncate">
                        {m.reason || <span className="text-[#9B9590]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#5C5550]">
                        {m.operator_name || <span className="text-[#9B9590]">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Timeline View */}
        {viewMode === 'timeline' && (
          <div className="bg-white border border-[#E8E4DE] rounded-xl shadow-sm p-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-[#F0EDE8] shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-4 bg-[#F0EDE8] rounded w-2/3" />
                      <div className="h-3 bg-[#F0EDE8] rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : movements.length === 0 ? (
              <div className="text-center py-12 text-[#9B9590]">
                <Clock size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm text-[#5C5550]">Aucun mouvement à afficher</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[17px] top-2 bottom-2 w-px bg-[#E8E4DE]" />
                <div className="space-y-1">
                  {movements.map((m: any, index: number) => {
                    const dotColor = DOT_COLORS[m.movement_type] || DOT_COLORS.default;
                    return (
                      <div key={m.id} className="flex gap-4 group">
                        <div className="relative z-10 mt-1.5 shrink-0">
                          <div
                            className="w-[18px] h-[18px] rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: dotColor }}
                          />
                        </div>
                        <div className="flex-1 pb-5 border-b border-[#E8E4DE] last:border-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <MovementBadge type={m.movement_type} />
                                {m.lot_number && (
                                  <span className="text-sm font-medium text-[#1A1714]">{m.lot_number}</span>
                                )}
                                <span className="text-sm font-bold text-[#1A1714]">
                                  {Number(m.volume_liters).toLocaleString('fr')} L
                                </span>
                              </div>
                              {(m.from_container_code || m.to_container_code) && (
                                <p className="text-xs text-[#5C5550] mt-1">
                                  {m.from_container_code && <span>{m.from_container_code}</span>}
                                  {m.from_container_code && m.to_container_code && <span className="mx-1">→</span>}
                                  {m.to_container_code && <span>{m.to_container_code}</span>}
                                </p>
                              )}
                              {m.reason && (
                                <p className="text-xs text-[#9B9590] mt-0.5 truncate">{m.reason}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-[#5C5550] whitespace-nowrap">
                                {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </p>
                              {m.operator_name && (
                                <p className="text-xs text-[#9B9590] mt-0.5">{m.operator_name}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {showCreate && (
        <CreateMovementModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['movements'] });
            queryClient.invalidateQueries({ queryKey: ['lots'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function CreateMovementModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    movement_type: 'transfert', lot_id: '', from_container_id: '',
    to_container_id: '', volume_liters: '', reason: '', notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: lots = [] } = useQuery({
    queryKey: ['lots-active'],
    queryFn: () => api<any[]>('/lots?status=active')
  });
  const { data: containers = [] } = useQuery({
    queryKey: ['containers-all'],
    queryFn: () => api<any[]>('/containers')
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/movements', { method: 'POST', body: JSON.stringify(form) });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white border border-[#E8E4DE] rounded-lg px-3 py-2 text-sm text-[#1A1714] placeholder-[#9B9590] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors";
  const labelClass = "block text-sm font-medium text-[#5C5550] mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#E8E4DE] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E4DE]">
          <h2 className="text-lg font-semibold text-[#1A1714]">Enregistrer un mouvement</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9B9590] hover:text-[#5C5550] hover:bg-[#F0EDE8] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Type de mouvement *</label>
              <select
                className={inputClass}
                value={form.movement_type}
                onChange={e => setForm({ ...form, movement_type: e.target.value })}
              >
                {Object.entries(MOVEMENT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Lot *</label>
              <select
                className={inputClass}
                value={form.lot_id}
                onChange={e => setForm({ ...form, lot_id: e.target.value })}
                required
              >
                <option value="">Sélectionner un lot</option>
                {(lots as any[]).map((l: any) => (
                  <option key={l.id} value={l.id}>{l.lot_number} — {l.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>De (contenant)</label>
                <select
                  className={inputClass}
                  value={form.from_container_id}
                  onChange={e => setForm({ ...form, from_container_id: e.target.value })}
                >
                  <option value="">—</option>
                  {(containers as any[]).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Vers (contenant)</label>
                <select
                  className={inputClass}
                  value={form.to_container_id}
                  onChange={e => setForm({ ...form, to_container_id: e.target.value })}
                >
                  <option value="">—</option>
                  {(containers as any[]).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Volume (L) *</label>
              <input
                type="number"
                className={inputClass}
                value={form.volume_liters}
                onChange={e => setForm({ ...form, volume_liters: e.target.value })}
                min={0}
                step={0.1}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Raison</label>
              <input
                className={inputClass}
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="Motif du mouvement..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#5C5550] bg-white border border-[#E8E4DE] hover:bg-[#F9F8F6] shadow-sm transition-all duration-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all duration-200 disabled:opacity-60"
                style={{ backgroundColor: '#8B1A2F' }}
                onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = '#6F1526')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#8B1A2F')}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
