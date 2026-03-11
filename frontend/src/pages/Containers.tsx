import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Package, Plus, Search } from 'lucide-react';

const CONTAINER_TYPES: Record<string, string> = {
  cuve_inox: 'Cuve Inox', cuve_beton: 'Cuve Béton', barrique: 'Barrique',
  foudre: 'Foudre', citerne: 'Citerne', bouteille: 'Bouteille', autre: 'Autre'
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: 'Disponible', color: '#22c55e' },
  in_use: { label: 'En utilisation', color: '#3b82f6' },
  empty: { label: 'Vide', color: '#6b7280' },
  maintenance: { label: 'Maintenance', color: '#f59e0b' },
  cleaning: { label: 'Nettoyage', color: '#a78bfa' },
};

export default function Containers() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: containers = [], isLoading } = useQuery({
    queryKey: ['containers', filterStatus, filterType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterType) params.set('type', filterType);
      return api<any[]>(`/containers?${params}`);
    },
  });

  const filtered = containers.filter(c =>
    search === '' ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5e6ea] flex items-center gap-2">
            <Package size={24} className="text-gold-400" />
            Contenants
          </h1>
          <p className="text-[#c4a0aa] text-sm mt-1">{filtered.length} contenants</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> Ajouter</button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b4050]" />
          <input className="input pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select className="select w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(CONTAINER_TYPES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({length: 6}).map((_, i) => (
            <div key={i} className="card"><div className="skeleton h-20" /></div>
          ))
        ) : filtered.map((c: any) => {
          const statusConf = STATUS_CONFIG[c.status] || STATUS_CONFIG.available;
          const fillPercent = c.capacity_liters > 0 ? Math.min(100, (c.current_volume_liters / c.capacity_liters) * 100) : 0;
          return (
            <div key={c.id} className="card hover:border-bordeaux-700/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-[#f5e6ea]">{c.code}</p>
                  <p className="text-sm text-[#c4a0aa]">{c.name}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full border" style={{ color: statusConf.color, borderColor: statusConf.color + '50', background: statusConf.color + '15' }}>
                  {statusConf.label}
                </span>
              </div>
              <p className="text-xs text-[#c4a0aa] mb-2">{CONTAINER_TYPES[c.type] || c.type} · {c.location || '—'}</p>
              <div>
                <div className="flex justify-between text-xs text-[#c4a0aa] mb-1">
                  <span>Remplissage</span>
                  <span>{Number(c.current_volume_liters || 0).toLocaleString('fr')} / {Number(c.capacity_liters).toLocaleString('fr')} L</span>
                </div>
                <div className="w-full bg-[#2a1520] rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-gold-500" style={{ width: `${fillPercent}%` }} />
                </div>
              </div>
              {c.current_lots?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(c.current_lots as any[]).map((l: any) => (
                    <span key={l.lot_id} className="text-xs bg-bordeaux-900/30 text-bordeaux-300 px-1.5 py-0.5 rounded">
                      {l.lot_number}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-[#c4a0aa]">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            Aucun contenant
          </div>
        )}
      </div>

      {showCreate && (
        <CreateContainerModal onClose={() => setShowCreate(false)} onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['containers'] });
          setShowCreate(false);
        }} />
      )}
    </div>
  );
}

function CreateContainerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ code: '', name: '', type: 'cuve_inox', capacity_liters: '', location: '', material: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/containers', { method: 'POST', body: JSON.stringify(form) });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#f5e6ea]">Nouveau contenant</h2>
          <button onClick={onClose} className="btn-ghost text-xs">✕</button>
        </div>
        {error && <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Code *</label><input className="input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required /></div>
            <div><label className="label">Nom *</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                {Object.entries(CONTAINER_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div><label className="label">Capacité (L) *</label><input type="number" className="input" value={form.capacity_liters} onChange={e => setForm({...form, capacity_liters: e.target.value})} min={0} required /></div>
          </div>
          <div><label className="label">Emplacement</label><input className="input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? '...' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
