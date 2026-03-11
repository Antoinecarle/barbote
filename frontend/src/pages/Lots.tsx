import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Wine, Plus, Search, Eye, TrendingDown, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Lot {
  id: string;
  lot_number: string;
  name: string;
  type: string;
  appellation: string;
  vintage_year: number;
  grape_varieties: Array<{variety: string; percentage: number}>;
  initial_volume_liters: number;
  current_volume_liters: number;
  status: string;
  quality_score?: number;
  harvest_date?: string;
  notes?: string;
  current_containers: Array<{container_id: string; code: string; name: string; volume: number}>;
  latest_analysis?: any;
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  active: { label: 'Actif', class: 'badge-active' },
  bottled: { label: 'Mis en bouteille', class: 'badge-bottled' },
  archived: { label: 'Archivé', class: 'badge-archived' },
  sold: { label: 'Vendu', class: 'badge-archived' },
  spoiled: { label: 'Perdu', class: 'badge-warning' },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  rouge: { label: 'Rouge', color: '#be185d' },
  blanc: { label: 'Blanc', color: '#d4a017' },
  rose: { label: 'Rosé', color: '#f9a8d4' },
  petillant: { label: 'Pétillant', color: '#93c5fd' },
  mousseux: { label: 'Mousseux', color: '#a78bfa' },
  muté: { label: 'Muté', color: '#fb923c' },
  autre: { label: 'Autre', color: '#6b7280' },
};

export default function Lots() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: lots = [], isLoading } = useQuery({
    queryKey: ['lots', filterStatus, filterType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterType) params.set('type', filterType);
      return api<Lot[]>(`/lots?${params}`);
    },
  });

  const filteredLots = lots.filter(lot =>
    search === '' ||
    lot.lot_number.toLowerCase().includes(search.toLowerCase()) ||
    lot.name.toLowerCase().includes(search.toLowerCase()) ||
    (lot.appellation || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalVolume = filteredLots
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + Number(l.current_volume_liters), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5e6ea] flex items-center gap-2">
            <Wine size={24} className="text-bordeaux-400" />
            Lots de vin
          </h1>
          <p className="text-[#c4a0aa] text-sm mt-1">
            {filteredLots.length} lots · {Math.round(totalVolume).toLocaleString('fr')} L actif
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Nouveau lot
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b4050]" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Rechercher lot..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="select w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <select className="select w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_CONFIG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#2a1520]">
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa] font-medium">Lot</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa] font-medium">Type</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa] font-medium">Millésime</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa] font-medium">Appellation</th>
              <th className="text-right px-4 py-3 text-xs text-[#c4a0aa] font-medium">Volume</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa] font-medium">Statut</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa] font-medium">Contenants</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({length: 5}).map((_, i) => (
                <tr key={i} className="table-row">
                  <td colSpan={8} className="px-4 py-3">
                    <div className="skeleton h-4 w-full" />
                  </td>
                </tr>
              ))
            ) : filteredLots.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[#c4a0aa]">
                  <Wine size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Aucun lot trouvé</p>
                </td>
              </tr>
            ) : (
              filteredLots.map(lot => {
                const typeConfig = TYPE_CONFIG[lot.type] || TYPE_CONFIG.autre;
                const statusConfig = STATUS_CONFIG[lot.status] || STATUS_CONFIG.active;
                const volumePercent = Math.min(100, (lot.current_volume_liters / lot.initial_volume_liters) * 100);
                return (
                  <tr key={lot.id} className="table-row cursor-pointer" onClick={() => navigate(`/lots/${lot.id}`)}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#f5e6ea]">{lot.lot_number}</p>
                        <p className="text-xs text-[#c4a0aa]">{lot.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: typeConfig.color }} />
                        <span className="text-sm text-[#f5e6ea]">{typeConfig.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#f5e6ea]">{lot.vintage_year || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#c4a0aa]">{lot.appellation || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div>
                        <p className="text-sm font-medium text-[#f5e6ea]">
                          {Number(lot.current_volume_liters).toLocaleString('fr')} L
                        </p>
                        <div className="w-16 ml-auto bg-[#2a1520] rounded-full h-1 mt-1">
                          <div
                            className="h-1 rounded-full transition-all"
                            style={{ width: `${volumePercent}%`, background: typeConfig.color }}
                          />
                        </div>
                        <p className="text-xs text-[#c4a0aa]">{Math.round(volumePercent)}% initial</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusConfig.class}>{statusConfig.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-[#c4a0aa]">
                        {(lot.current_containers as any[]).length > 0 ? (
                          (lot.current_containers as any[]).map((c: any) => c.code).join(', ')
                        ) : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button className="btn-ghost text-xs px-2 py-1" onClick={(e) => { e.stopPropagation(); navigate(`/lots/${lot.id}`); }}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateLotModal onClose={() => setShowCreate(false)} onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['lots'] });
          setShowCreate(false);
        }} />
      )}
    </div>
  );
}

function CreateLotModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    lot_number: `LOT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    name: '',
    type: 'rouge',
    appellation: '',
    vintage_year: new Date().getFullYear(),
    initial_volume_liters: '',
    harvest_date: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/lots', {
        method: 'POST',
        body: JSON.stringify(form)
      });
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#f5e6ea]">Nouveau lot</h2>
          <button onClick={onClose} className="btn-ghost text-xs">✕</button>
        </div>
        {error && <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">N° de lot *</label>
              <input className="input" value={form.lot_number} onChange={e => setForm({...form, lot_number: e.target.value})} required />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type *</label>
              <select className="select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                {Object.entries(TYPE_CONFIG).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Millésime</label>
              <input type="number" className="input" value={form.vintage_year} onChange={e => setForm({...form, vintage_year: Number(e.target.value)})} min={1900} max={2100} />
            </div>
          </div>
          <div>
            <label className="label">Appellation</label>
            <input className="input" value={form.appellation} onChange={e => setForm({...form, appellation: e.target.value})} placeholder="ex: Bordeaux AOC" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Volume initial (L) *</label>
              <input type="number" className="input" value={form.initial_volume_liters} onChange={e => setForm({...form, initial_volume_liters: e.target.value})} min={0} step={0.1} required />
            </div>
            <div>
              <label className="label">Date de vendange</label>
              <input type="date" className="input" value={form.harvest_date} onChange={e => setForm({...form, harvest_date: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none h-20" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? '...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
