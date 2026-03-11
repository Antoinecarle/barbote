import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Package, Plus, Search, Grid3X3, List, X } from 'lucide-react';

const CONTAINER_TYPES: Record<string, string> = {
  cuve_inox: 'Cuve Inox', cuve_beton: 'Cuve Béton', barrique: 'Barrique',
  foudre: 'Foudre', citerne: 'Citerne', bouteille: 'Bouteille', autre: 'Autre'
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  available:  { label: 'Disponible',    bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  in_use:     { label: 'En utilisation', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  empty:      { label: 'Vide',           bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  maintenance:{ label: 'Maintenance',    bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  cleaning:   { label: 'Nettoyage',      bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
};

function StatusBadge({ status }: { status: string }) {
  const conf = STATUS_CONFIG[status] || STATUS_CONFIG.empty;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ backgroundColor: conf.bg, color: conf.text, borderColor: conf.border }}
    >
      {conf.label}
    </span>
  );
}

export default function Containers() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Package size={22} className="text-[#8B1A2F]" />
              Contenants
            </h1>
            <p className="text-sm text-gray-500 mt-1">{filtered.length} contenant{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all duration-200"
            style={{ backgroundColor: '#8B1A2F' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6F1526')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#8B1A2F')}
          >
            <Plus size={16} />
            Nouveau contenant
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-44 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors"
              placeholder="Rechercher un contenant..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <select
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">Tous les types</option>
            {Object.entries(CONTAINER_TYPES).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'grid'
                  ? 'bg-[#8B1A2F] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Grid3X3 size={14} />
              Grille
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-[#8B1A2F] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <List size={14} />
              Tableau
            </button>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm animate-pulse">
                  <div className="h-20 bg-gray-100 rounded" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="col-span-3 text-center py-16">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Package size={22} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Aucun contenant trouvé</p>
                  <p className="text-xs text-gray-400">Modifiez vos filtres ou ajoutez un contenant</p>
                </div>
              </div>
            ) : (
              filtered.map((c: any) => {
                const fillPercent = c.capacity_liters > 0
                  ? Math.min(100, (c.current_volume_liters / c.capacity_liters) * 100)
                  : 0;
                const fillColor = fillPercent > 80 ? '#15803D' : fillPercent > 40 ? '#8B1A2F' : '#D97706';
                return (
                  <div
                    key={c.id}
                    className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#FDF2F4] flex items-center justify-center border border-[#F3C5CE]">
                          <Package size={16} className="text-[#8B1A2F]" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm leading-tight">{c.code}</p>
                          <p className="text-xs text-gray-500">{c.name}</p>
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-medium">
                        {CONTAINER_TYPES[c.type] || c.type}
                      </span>
                      {c.location && (
                        <span className="text-xs text-gray-400">{c.location}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>Remplissage</span>
                        <span className="font-medium text-gray-700">
                          {Number(c.current_volume_liters || 0).toLocaleString('fr')} / {Number(c.capacity_liters).toLocaleString('fr')} L
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${fillPercent}%`, backgroundColor: fillColor }}
                        />
                      </div>
                    </div>

                    {c.current_lots?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {(c.current_lots as any[]).map((l: any) => (
                          <span
                            key={l.lot_id}
                            className="text-xs bg-[#FDF2F4] text-[#8B1A2F] border border-[#F3C5CE] px-1.5 py-0.5 rounded-md font-medium"
                          >
                            {l.lot_number}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contenant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Emplacement</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacité</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Remplissage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lot(s)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Package size={28} />
                        <p className="text-sm text-gray-500">Aucun contenant trouvé</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c: any) => {
                    const fillPercent = c.capacity_liters > 0
                      ? Math.min(100, (c.current_volume_liters / c.capacity_liters) * 100)
                      : 0;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors duration-100">
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">{c.code}</p>
                          <p className="text-xs text-gray-500">{c.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {CONTAINER_TYPES[c.type] || c.type}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {c.location || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          {Number(c.capacity_liters).toLocaleString('fr')} L
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden min-w-16">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${fillPercent}%`,
                                  backgroundColor: fillPercent > 80 ? '#15803D' : '#8B1A2F'
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {Math.round(fillPercent)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {c.current_lots?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(c.current_lots as any[]).slice(0, 2).map((l: any) => (
                                <span
                                  key={l.lot_id}
                                  className="text-xs bg-[#FDF2F4] text-[#8B1A2F] border border-[#F3C5CE] px-1.5 py-0.5 rounded-md font-medium"
                                >
                                  {l.lot_number}
                                </span>
                              ))}
                              {c.current_lots.length > 2 && (
                                <span className="text-xs text-gray-400">+{c.current_lots.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateContainerModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['containers'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function CreateContainerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    code: '', name: '', type: 'cuve_inox', capacity_liters: '', location: '', material: '', notes: ''
  });
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

  const inputClass = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Nouveau contenant</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Code *</label>
                <input
                  className={inputClass}
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  placeholder="CUV-01"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Nom *</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Cuve principale"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Type</label>
                <select
                  className={inputClass}
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  {Object.entries(CONTAINER_TYPES).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Capacité (L) *</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.capacity_liters}
                  onChange={e => setForm({ ...form, capacity_liters: e.target.value })}
                  min={0}
                  placeholder="5000"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Emplacement</label>
              <input
                className={inputClass}
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                placeholder="Cave A, Rang 3..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-all duration-200"
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
                {loading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
