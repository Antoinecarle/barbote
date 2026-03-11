import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Wrench, Plus } from 'lucide-react';

const MAINTENANCE_TYPES: Record<string, string> = {
  cleaning: 'Nettoyage', repair: 'Réparation', inspection: 'Inspection',
  calibration: 'Calibration', replacement: 'Remplacement', autre: 'Autre'
};

export default function Maintenance() {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: maintenance = [], isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => api<any[]>('/maintenance'),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5e6ea] flex items-center gap-2">
            <Wrench size={24} className="text-orange-400" />
            Maintenance
          </h1>
          <p className="text-[#c4a0aa] text-sm mt-1">Maintenance et entretien des contenants</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> Planifier</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a1520]">
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Contenant</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Type</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Description</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Date planifiée</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Technicien</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Statut</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({length: 3}).map((_, i) => (
                <tr key={i} className="table-row"><td colSpan={6} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td></tr>
              ))
            ) : maintenance.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-[#c4a0aa] text-sm">
                <Wrench size={32} className="mx-auto mb-2 opacity-30" />
                Aucune maintenance planifiée
              </td></tr>
            ) : maintenance.map((m: any) => (
              <tr key={m.id} className="table-row">
                <td className="px-4 py-3"><p className="text-sm text-[#f5e6ea]">{m.container_code}</p><p className="text-xs text-[#c4a0aa]">{m.container_name}</p></td>
                <td className="px-4 py-3 text-sm text-[#f5e6ea]">{MAINTENANCE_TYPES[m.maintenance_type] || m.maintenance_type}</td>
                <td className="px-4 py-3 text-sm text-[#c4a0aa] max-w-xs truncate">{m.description}</td>
                <td className="px-4 py-3 text-sm text-[#f5e6ea]">{m.scheduled_date ? new Date(m.scheduled_date).toLocaleDateString('fr-FR') : '—'}</td>
                <td className="px-4 py-3 text-sm text-[#c4a0aa]">{m.technician || '—'}</td>
                <td className="px-4 py-3">
                  <span className={m.status === 'done' ? 'badge-active' : m.status === 'in_progress' ? 'badge-warning' : 'badge-bottled'}>
                    {m.status === 'done' ? 'Terminé' : m.status === 'in_progress' ? 'En cours' : 'Planifié'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateMaintenanceModal onClose={() => setShowCreate(false)} onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['maintenance'] });
          setShowCreate(false);
        }} />
      )}
    </div>
  );
}

function CreateMaintenanceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: containers = [] } = useQuery({ queryKey: ['containers-all'], queryFn: () => api<any[]>('/containers') });
  const [form, setForm] = useState({ container_id: '', maintenance_type: 'cleaning', scheduled_date: '', description: '', technician: '', cost: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/maintenance', { method: 'POST', body: JSON.stringify(form) });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#f5e6ea]">Planifier maintenance</h2>
          <button onClick={onClose} className="btn-ghost text-xs">✕</button>
        </div>
        {error && <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Contenant *</label>
            <select className="select" value={form.container_id} onChange={e => setForm({...form, container_id: e.target.value})} required>
              <option value="">Sélectionner</option>
              {(containers as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type *</label>
              <select className="select" value={form.maintenance_type} onChange={e => setForm({...form, maintenance_type: e.target.value})}>
                {Object.entries(MAINTENANCE_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div><label className="label">Date planifiée</label><input type="date" className="input" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} /></div>
          </div>
          <div><label className="label">Description *</label><textarea className="input resize-none h-16" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Technicien</label><input className="input" value={form.technician} onChange={e => setForm({...form, technician: e.target.value})} /></div>
            <div><label className="label">Coût (€)</label><input type="number" className="input" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} /></div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? '...' : 'Planifier'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
