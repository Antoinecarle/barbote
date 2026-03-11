import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Wine, Plus, Search, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  active:   { label: 'Actif',             bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  bottled:  { label: 'Mis en bouteille',  bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  archived: { label: 'Archivé',           bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  sold:     { label: 'Vendu',             bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  spoiled:  { label: 'Perdu',             bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  rouge:     { label: 'Rouge',    color: '#8B1A2F', bg: '#FDF2F4' },
  blanc:     { label: 'Blanc',    color: '#D97706', bg: '#FFFBEB' },
  rose:      { label: 'Rosé',     color: '#DB2777', bg: '#FDF2F8' },
  petillant: { label: 'Pétillant', color: '#1D4ED8', bg: '#EFF6FF' },
  mousseux:  { label: 'Mousseux', color: '#7C3AED', bg: '#F5F3FF' },
  muté:      { label: 'Muté',     color: '#C2410C', bg: '#FFF7ED' },
  autre:     { label: 'Autre',    color: '#6B7280', bg: '#F3F4F6' },
};

const PAGE_SIZE = 15;

export default function Lots() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
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

  const activeCount   = lots.filter(l => l.status === 'active').length;
  const bottledCount  = lots.filter(l => l.status === 'bottled').length;
  const archivedCount = lots.filter(l => l.status === 'archived' || l.status === 'sold').length;

  const totalPages = Math.max(1, Math.ceil(filteredLots.length / PAGE_SIZE));
  const pagedLots  = filteredLots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Lots de vin</h1>
            <p className="text-sm text-gray-500 mt-0.5">Gérez vos lots de vinification</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all duration-200"
            style={{ backgroundColor: '#8B1A2F' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6F1526')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#8B1A2F')}
          >
            <Plus size={15} />
            Nouveau lot
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Actifs',         value: activeCount,   color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
            { label: 'En bouteille',   value: bottledCount,  color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Archivés',       value: archivedCount, color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' },
            {
              label: 'Volume actif',
              value: `${Math.round(totalVolume).toLocaleString('fr')} L`,
              color: '#8B1A2F',
              bg: '#FDF2F4',
              border: '#F3C5CE',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border px-4 py-3"
              style={{ borderColor: stat.border }}
            >
              <p className="text-xs font-medium" style={{ color: stat.color }}>{stat.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
              style={{ '--tw-ring-color': 'rgba(139,26,47,0.2)' } as React.CSSProperties}
              onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = ''; }}
              placeholder="Rechercher un lot…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="px-3 py-2 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 shadow-sm focus:outline-none cursor-pointer"
            value={filterType}
            onChange={handleFilterChange(setFilterType)}
          >
            <option value="">Tous les types</option>
            {Object.entries(TYPE_CONFIG).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 text-sm rounded-lg bg-white border border-gray-300 text-gray-700 shadow-sm focus:outline-none cursor-pointer"
            value={filterStatus}
            onChange={handleFilterChange(setFilterStatus)}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Numéro', 'Nom', 'Type', 'Millésime', 'Volume', 'Statut', 'Contenants', ''].map((col, i) => (
                  <th
                    key={col || i}
                    className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${
                      col === 'Volume' ? 'text-right' : col === '' ? '' : 'text-left'
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : pagedLots.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Wine size={32} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">Aucun lot trouvé</p>
                    <p className="text-xs text-gray-400 mt-1">Essayez de modifier vos filtres</p>
                  </td>
                </tr>
              ) : (
                pagedLots.map(lot => {
                  const typeConf   = TYPE_CONFIG[lot.type]   || TYPE_CONFIG.autre;
                  const statusConf = STATUS_CONFIG[lot.status] || STATUS_CONFIG.active;
                  const volumePct  = lot.initial_volume_liters > 0
                    ? Math.min(100, (lot.current_volume_liters / lot.initial_volume_liters) * 100)
                    : 0;
                  return (
                    <tr
                      key={lot.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/lots/${lot.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900">{lot.lot_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{lot.name}</span>
                        {lot.appellation && (
                          <p className="text-xs text-gray-400 mt-0.5">{lot.appellation}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: typeConf.bg, color: typeConf.color }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: typeConf.color }}
                          />
                          {typeConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{lot.vintage_year || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {Number(lot.current_volume_liters).toLocaleString('fr')} L
                        </p>
                        <div className="w-16 ml-auto bg-gray-100 rounded-full h-1 mt-1.5">
                          <div
                            className="h-1 rounded-full transition-all"
                            style={{ width: `${volumePct}%`, backgroundColor: typeConf.color }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{Math.round(volumePct)}%</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: statusConf.bg,
                            color: statusConf.text,
                            borderColor: statusConf.border,
                          }}
                        >
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">
                          {(lot.current_containers as any[]).length > 0
                            ? (lot.current_containers as any[]).map((c: any) => c.code).join(', ')
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          onClick={e => { e.stopPropagation(); navigate(`/lots/${lot.id}`); }}
                          title="Voir le lot"
                        >
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

          {/* Pagination */}
          {!isLoading && filteredLots.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredLots.length)} sur {filteredLots.length} lots
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                      page === i + 1
                        ? 'text-white'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    style={page === i + 1 ? { backgroundColor: '#8B1A2F' } : {}}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateLotModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['lots'] });
            setShowCreate(false);
          }}
        />
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
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/lots', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none transition';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.06)' }}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Wine size={18} style={{ color: '#8B1A2F' }} />
            <h2 className="text-base font-semibold text-gray-900">Nouveau lot</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
              <X size={14} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>N° de lot <span className="text-red-500">*</span></label>
              <input
                className={inputClass}
                value={form.lot_number}
                onChange={e => setForm({ ...form, lot_number: e.target.value })}
                onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = ''; }}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Nom <span className="text-red-500">*</span></label>
              <input
                className={inputClass}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = ''; }}
                placeholder="ex: Cuvée Prestige"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Type <span className="text-red-500">*</span></label>
              <select
                className={inputClass + ' cursor-pointer'}
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = ''; }}
              >
                {Object.entries(TYPE_CONFIG).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Millésime</label>
              <input
                type="number"
                className={inputClass}
                value={form.vintage_year}
                onChange={e => setForm({ ...form, vintage_year: Number(e.target.value) })}
                onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = ''; }}
                min={1900}
                max={2100}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Appellation</label>
            <input
              className={inputClass}
              value={form.appellation}
              onChange={e => setForm({ ...form, appellation: e.target.value })}
              onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = ''; }}
              placeholder="ex: Bordeaux AOC"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Volume initial (L) <span className="text-red-500">*</span></label>
              <input
                type="number"
                className={inputClass}
                value={form.initial_volume_liters}
                onChange={e => setForm({ ...form, initial_volume_liters: e.target.value })}
                onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = ''; }}
                min={0}
                step={0.1}
                placeholder="ex: 5000"
                required
              />
            </div>
            <div>
              <label className={labelClass}>Date de vendange</label>
              <input
                type="date"
                className={inputClass}
                value={form.harvest_date}
                onChange={e => setForm({ ...form, harvest_date: e.target.value })}
                onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = ''; }}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className={inputClass + ' resize-none h-20'}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = ''; }}
              placeholder="Informations complémentaires…"
            />
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all duration-200 disabled:opacity-60"
              style={{ backgroundColor: loading ? '#9CA3AF' : '#8B1A2F' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#6F1526'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#8B1A2F'; }}
            >
              {loading ? 'Création…' : 'Créer le lot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
