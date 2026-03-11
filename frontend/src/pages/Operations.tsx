import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Beaker, Plus } from 'lucide-react';

const OPERATION_TYPES: Record<string, string> = {
  sulfitage: 'Sulfitage', levurage: 'Levurage', collage: 'Collage',
  filtration: 'Filtration', malo: 'Fermentation malolactique',
  chaptalisation: 'Chaptalisation', acidification: 'Acidification',
  desacidification: 'Désacidification', flash_pasteurisation: 'Flash pasteurisation',
  micro_oxygenation: 'Micro-oxygénation', batonnage: 'Bâtonnage', autre: 'Autre'
};

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  planned: { label: 'Planifié', class: 'badge-bottled' },
  in_progress: { label: 'En cours', class: 'badge-warning' },
  done: { label: 'Terminé', class: 'badge-active' },
  cancelled: { label: 'Annulé', class: 'badge-archived' },
};

export default function Operations() {
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const queryClient = useQueryClient();

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ['operations', filterStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      return api<any[]>(`/operations?${params}`);
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5e6ea] flex items-center gap-2">
            <Beaker size={24} className="text-green-400" />
            Opérations
          </h1>
          <p className="text-[#c4a0aa] text-sm mt-1">Traitements et opérations cave</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> Nouvelle opération</button>
      </div>

      <div className="flex gap-3">
        <select className="select w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a1520]">
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Date</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Opération</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Lot</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Objectif</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Statut</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({length: 5}).map((_, i) => (
                <tr key={i} className="table-row"><td colSpan={5} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td></tr>
              ))
            ) : operations.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-[#c4a0aa] text-sm">
                <Beaker size={32} className="mx-auto mb-2 opacity-30" />
                Aucune opération
              </td></tr>
            ) : operations.map((op: any) => {
              const statusConf = STATUS_CONFIG[op.status] || STATUS_CONFIG.planned;
              return (
                <tr key={op.id} className="table-row">
                  <td className="px-4 py-3 text-sm text-[#f5e6ea]">{new Date(op.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-sm text-[#f5e6ea]">{OPERATION_TYPES[op.operation_type] || op.operation_type}</td>
                  <td className="px-4 py-3"><p className="text-sm text-[#f5e6ea]">{op.lot_number || '—'}</p><p className="text-xs text-[#c4a0aa]">{op.lot_name}</p></td>
                  <td className="px-4 py-3 text-sm text-[#c4a0aa] max-w-xs truncate">{op.purpose}</td>
                  <td className="px-4 py-3"><span className={statusConf.class}>{statusConf.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateOperationModal onClose={() => setShowCreate(false)} onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['operations'] });
          setShowCreate(false);
        }} />
      )}
    </div>
  );
}

function CreateOperationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: lots = [] } = useQuery({ queryKey: ['lots-active'], queryFn: () => api<any[]>('/lots?status=active') });
  const { data: containers = [] } = useQuery({ queryKey: ['containers-all'], queryFn: () => api<any[]>('/containers') });
  const [form, setForm] = useState({ operation_type: 'sulfitage', lot_id: '', container_id: '', date: new Date().toISOString().split('T')[0], purpose: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/operations', { method: 'POST', body: JSON.stringify(form) });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#f5e6ea]">Nouvelle opération</h2>
          <button onClick={onClose} className="btn-ghost text-xs">✕</button>
        </div>
        {error && <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Type d'opération *</label>
            <select className="select" value={form.operation_type} onChange={e => setForm({...form, operation_type: e.target.value})}>
              {Object.entries(OPERATION_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Lot</label>
              <select className="select" value={form.lot_id} onChange={e => setForm({...form, lot_id: e.target.value})}>
                <option value="">—</option>
                {(lots as any[]).map((l: any) => <option key={l.id} value={l.id}>{l.lot_number}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>
          </div>
          <div>
            <label className="label">Objectif *</label>
            <input className="input" value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} required placeholder="ex: Ajuster le SO₂ libre" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none h-16" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? '...' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
