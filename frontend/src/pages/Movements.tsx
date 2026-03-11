import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ArrowLeftRight, Plus, Filter } from 'lucide-react';

const MOVEMENT_LABELS: Record<string, string> = {
  entree: 'Entrée', sortie: 'Sortie', transfert: 'Transfert',
  assemblage: 'Assemblage', soutirage: 'Soutirage', filtration: 'Filtration',
  collage: 'Collage', chaptalisation: 'Chaptalisation', acidification: 'Acidification',
  sulfitage: 'Sulfitage', levurage: 'Levurage', malo: 'FML', perte: 'Perte',
  centrifugation: 'Centrifugation', bottling: 'Mise en bouteille'
};

const MOVEMENT_COLORS: Record<string, string> = {
  entree: '#22c55e', sortie: '#ef4444', transfert: '#3b82f6',
  assemblage: '#a855f7', perte: '#f59e0b', bottling: '#06b6d4', default: '#6b7280'
};

export default function Movements() {
  const [showCreate, setShowCreate] = useState(false);
  const [filterType, setFilterType] = useState('');
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5e6ea] flex items-center gap-2">
            <ArrowLeftRight size={24} className="text-blue-400" />
            Mouvements
          </h1>
          <p className="text-[#c4a0aa] text-sm mt-1">{movements.length} mouvements chargés</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> Enregistrer</button>
      </div>

      {/* Stats */}
      {stats?.movement_types?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.movement_types.slice(0, 4).map((mt: any) => (
            <div key={mt.movement_type} className="card p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: MOVEMENT_COLORS[mt.movement_type] || MOVEMENT_COLORS.default }} />
                <p className="text-xs text-[#c4a0aa]">{MOVEMENT_LABELS[mt.movement_type] || mt.movement_type}</p>
              </div>
              <p className="text-xl font-bold text-[#f5e6ea]">{mt.count}</p>
              <p className="text-xs text-[#c4a0aa]">{Math.round(Number(mt.total_volume || 0)).toLocaleString('fr')} L</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3">
        <select className="select w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(MOVEMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a1520]">
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Date</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Type</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Lot</th>
              <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">Volume</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">De → Vers</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Opérateur</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Raison</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({length: 8}).map((_, i) => (
                <tr key={i} className="table-row"><td colSpan={7} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td></tr>
              ))
            ) : movements.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-[#c4a0aa] text-sm"><ArrowLeftRight size={32} className="mx-auto mb-2 opacity-30" />Aucun mouvement</td></tr>
            ) : (
              movements.map((m: any) => (
                <tr key={m.id} className="table-row">
                  <td className="px-4 py-3 text-sm text-[#f5e6ea]">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: MOVEMENT_COLORS[m.movement_type] || MOVEMENT_COLORS.default }} />
                      <span className="text-sm text-[#f5e6ea]">{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-[#f5e6ea]">{m.lot_number || '—'}</p>
                    <p className="text-xs text-[#c4a0aa]">{m.lot_name}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-[#f5e6ea]">
                    {Number(m.volume_liters).toLocaleString('fr')} L
                  </td>
                  <td className="px-4 py-3 text-sm text-[#c4a0aa]">
                    {m.from_container_code && <span>{m.from_container_code}</span>}
                    {m.from_container_code && m.to_container_code && <span className="mx-1">→</span>}
                    {m.to_container_code && <span>{m.to_container_code}</span>}
                    {!m.from_container_code && !m.to_container_code && '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#c4a0aa]">{m.operator_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#c4a0aa] max-w-xs truncate">{m.reason || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateMovementModal onClose={() => setShowCreate(false)} onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['movements'] });
          queryClient.invalidateQueries({ queryKey: ['lots'] });
          setShowCreate(false);
        }} />
      )}
    </div>
  );
}

function CreateMovementModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ movement_type: 'transfert', lot_id: '', from_container_id: '', to_container_id: '', volume_liters: '', reason: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: lots = [] } = useQuery({ queryKey: ['lots-active'], queryFn: () => api<any[]>('/lots?status=active') });
  const { data: containers = [] } = useQuery({ queryKey: ['containers-all'], queryFn: () => api<any[]>('/containers') });

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

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#f5e6ea]">Enregistrer un mouvement</h2>
          <button onClick={onClose} className="btn-ghost text-xs">✕</button>
        </div>
        {error && <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Type de mouvement *</label>
            <select className="select" value={form.movement_type} onChange={e => setForm({...form, movement_type: e.target.value})}>
              {Object.entries(MOVEMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Lot *</label>
            <select className="select" value={form.lot_id} onChange={e => setForm({...form, lot_id: e.target.value})} required>
              <option value="">Sélectionner un lot</option>
              {(lots as any[]).map((l: any) => <option key={l.id} value={l.id}>{l.lot_number} — {l.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">De (contenant)</label>
              <select className="select" value={form.from_container_id} onChange={e => setForm({...form, from_container_id: e.target.value})}>
                <option value="">—</option>
                {(containers as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vers (contenant)</label>
              <select className="select" value={form.to_container_id} onChange={e => setForm({...form, to_container_id: e.target.value})}>
                <option value="">—</option>
                {(containers as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Volume (L) *</label>
            <input type="number" className="input" value={form.volume_liters} onChange={e => setForm({...form, volume_liters: e.target.value})} min={0} step={0.1} required />
          </div>
          <div>
            <label className="label">Raison</label>
            <input className="input" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? '...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
