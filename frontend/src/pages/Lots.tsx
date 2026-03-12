import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
  const container = useRef<HTMLDivElement>(null);

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

  useGSAP(() => {
    if (isLoading) return;
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('.lots-header', { y: -20, opacity: 0, duration: 0.5 });
    tl.from('.lots-stat', { y: 24, opacity: 0, stagger: 0.08, duration: 0.5 }, '-=0.2');
    tl.from('.lots-toolbar', { y: 16, opacity: 0, duration: 0.4 }, '-=0.2');

    gsap.from('.lots-table', {
      scrollTrigger: { trigger: '.lots-table', start: 'top 85%', once: true },
      y: 30, opacity: 0, duration: 0.6,
    });
  }, { scope: container, dependencies: [isLoading] });

  return (
    <div ref={container} className="min-h-screen bg-[#F5F3EF]">
      {/* Responsive horizontal padding: px-4 on mobile, px-6 on sm+ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Page header — flex-wrap keeps button from overflowing */}
        <div className="lots-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="text-xl sm:text-2xl font-semibold tracking-tight"
              style={{ color: '#1A1714', fontFamily: "'Cabinet Grotesk', 'Satoshi', system-ui, sans-serif" }}
            >
              Lots de vin
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#9B9590' }}>Gérez vos lots de vinification</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-white shadow-sm transition-all duration-200"
            style={{ backgroundColor: '#8B1A2F' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6F1526')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#8B1A2F')}
          >
            <Plus size={15} />
            Nouveau lot
          </button>
        </div>

        {/* Stats row — 2 cols on mobile, 4 cols on sm+ */}
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
              className="lots-stat bg-white rounded-xl border px-4 py-3"
              style={{ borderColor: stat.border }}
            >
              <p className="text-xs font-medium truncate" style={{ color: stat.color }}>{stat.label}</p>
              <p className="text-lg sm:text-xl font-bold mt-0.5 truncate" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar — wraps cleanly on mobile; search gets flex-1 with min-w-0 */}
        <div className="lots-toolbar flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-0" style={{ minWidth: '160px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9B9590' }} />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 min-h-[40px] text-sm rounded-lg bg-white shadow-sm focus:outline-none transition"
              style={{
                border: '1px solid #E8E4DE',
                color: '#1A1714',
              }}
              placeholder="Rechercher un lot…"
              onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E8E4DE'; e.currentTarget.style.boxShadow = ''; }}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="px-3 py-2 min-h-[40px] text-sm rounded-lg bg-white shadow-sm focus:outline-none cursor-pointer"
            style={{ border: '1px solid #E8E4DE', color: '#5C5550' }}
            value={filterType}
            onChange={handleFilterChange(setFilterType)}
          >
            <option value="">Tous les types</option>
            {Object.entries(TYPE_CONFIG).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 min-h-[40px] text-sm rounded-lg bg-white shadow-sm focus:outline-none cursor-pointer"
            style={{ border: '1px solid #E8E4DE', color: '#5C5550' }}
            value={filterStatus}
            onChange={handleFilterChange(setFilterStatus)}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>

        {/* Table — overflow-x-auto enables horizontal scroll on mobile; min-w-[640px] keeps layout intact */}
        <div
          className="lots-table bg-white rounded-xl overflow-hidden"
          style={{
            border: '1px solid #E8E4DE',
            boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr style={{ backgroundColor: '#F9F8F6', borderBottom: '1px solid #E8E4DE' }}>
                  {['Numéro', 'Nom', 'Type', 'Millésime', 'Volume', 'Statut', 'Contenants', ''].map((col, i) => (
                    <th
                      key={col || i}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${
                        col === 'Volume' ? 'text-right' : col === '' ? '' : 'text-left'
                      }`}
                      style={{ color: '#9B9590' }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ borderTop: 'none' }}>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #E8E4DE' }}>
                      <td colSpan={8} className="px-4 py-3">
                        <div
                          className="h-4 rounded animate-pulse w-full"
                          style={{ backgroundColor: '#F0EDE8' }}
                        />
                      </td>
                    </tr>
                  ))
                ) : pagedLots.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <Wine size={32} className="mx-auto mb-3" style={{ color: '#D6D0C8' }} />
                      <p className="text-sm" style={{ color: '#9B9590' }}>Aucun lot trouvé</p>
                      <p className="text-xs mt-1" style={{ color: '#C4BEB8' }}>Essayez de modifier vos filtres</p>
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
                        className="hover:bg-[#F9F8F6] cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid #F0EDE8' }}
                        onClick={() => navigate(`/lots/${lot.id}`)}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium" style={{ color: '#1A1714' }}>{lot.lot_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm" style={{ color: '#5C5550' }}>{lot.name}</span>
                          {lot.appellation && (
                            <p className="text-xs mt-0.5" style={{ color: '#9B9590' }}>{lot.appellation}</p>
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
                          <span className="text-sm" style={{ color: '#5C5550' }}>{lot.vintage_year || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-medium" style={{ color: '#1A1714' }}>
                            {Number(lot.current_volume_liters).toLocaleString('fr')} L
                          </p>
                          <div
                            className="w-16 ml-auto rounded-full h-1 mt-1.5"
                            style={{ backgroundColor: '#F0EDE8' }}
                          >
                            <div
                              className="h-1 rounded-full transition-all"
                              style={{ width: `${volumePct}%`, backgroundColor: typeConf.color }}
                            />
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: '#9B9590' }}>{Math.round(volumePct)}%</p>
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
                          <span className="text-xs" style={{ color: '#9B9590' }}>
                            {(lot.current_containers as any[]).length > 0
                              ? (lot.current_containers as any[]).map((c: any) => c.code).join(', ')
                              : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {/* Touch-friendly action button — min 44x44 */}
                          <button
                            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md transition-colors"
                            style={{ color: '#9B9590' }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color = '#5C5550';
                              e.currentTarget.style.backgroundColor = '#F0EDE8';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = '#9B9590';
                              e.currentTarget.style.backgroundColor = '';
                            }}
                            onClick={e => { e.stopPropagation(); navigate(`/lots/${lot.id}`); }}
                            title="Voir le lot"
                            aria-label="Voir le lot"
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

          {/* Pagination — touch-friendly 44x44 buttons */}
          {!isLoading && filteredLots.length > PAGE_SIZE && (
            <div
              className="flex flex-wrap items-center justify-between px-4 py-3 gap-2"
              style={{
                borderTop: '1px solid #E8E4DE',
                backgroundColor: '#F9F8F6',
              }}
            >
              <p className="text-xs" style={{ color: '#9B9590' }}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredLots.length)} sur {filteredLots.length} lots
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ color: '#9B9590' }}
                  onMouseEnter={e => {
                    if (page !== 1) {
                      e.currentTarget.style.color = '#1A1714';
                      e.currentTarget.style.backgroundColor = '#E8E4DE';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = '#9B9590';
                    e.currentTarget.style.backgroundColor = '';
                  }}
                  aria-label="Page précédente"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-xs font-medium transition-colors"
                    style={
                      page === i + 1
                        ? { backgroundColor: '#8B1A2F', color: '#ffffff' }
                        : { color: '#5C5550' }
                    }
                    onMouseEnter={e => {
                      if (page !== i + 1) e.currentTarget.style.backgroundColor = '#E8E4DE';
                    }}
                    onMouseLeave={e => {
                      if (page !== i + 1) e.currentTarget.style.backgroundColor = '';
                    }}
                    aria-label={`Page ${i + 1}`}
                    aria-current={page === i + 1 ? 'page' : undefined}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ color: '#9B9590' }}
                  onMouseEnter={e => {
                    if (page !== totalPages) {
                      e.currentTarget.style.color = '#1A1714';
                      e.currentTarget.style.backgroundColor = '#E8E4DE';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = '#9B9590';
                    e.currentTarget.style.backgroundColor = '';
                  }}
                  aria-label="Page suivante"
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

  const inputStyle: React.CSSProperties = {
    border: '1px solid #E8E4DE',
    color: '#1A1714',
    backgroundColor: '#ffffff',
  };

  const inputClass =
    'w-full px-3 py-2 min-h-[40px] text-sm rounded-lg shadow-sm focus:outline-none transition';

  const labelClass = 'block text-xs font-medium mb-1';

  const focusInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#8B1A2F';
    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)';
  };
  const blurInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#E8E4DE';
    e.currentTarget.style.boxShadow = '';
  };

  return (
    /* Full-screen overlay with p-4 safe area — modal fills most of screen on mobile */
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        style={{
          border: '1px solid #E8E4DE',
          boxShadow: '0 10px 15px rgba(26,23,20,0.08), 0 4px 6px rgba(26,23,20,0.06)',
        }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0 bg-white z-10"
          style={{ borderBottom: '1px solid #E8E4DE' }}
        >
          <div className="flex items-center gap-2">
            <Wine size={18} style={{ color: '#8B1A2F' }} />
            <h2
              className="text-base font-semibold"
              style={{ color: '#1A1714', fontFamily: "'Cabinet Grotesk', 'Satoshi', system-ui, sans-serif" }}
            >
              Nouveau lot
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md transition-colors"
            style={{ color: '#9B9590' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#5C5550'; e.currentTarget.style.backgroundColor = '#F0EDE8'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9B9590'; e.currentTarget.style.backgroundColor = ''; }}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
              <X size={14} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* 2-col on sm+, 1-col on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: '#5C5550' }}>
                N° de lot <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                style={inputStyle}
                value={form.lot_number}
                onChange={e => setForm({ ...form, lot_number: e.target.value })}
                onFocus={focusInput}
                onBlur={blurInput}
                required
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: '#5C5550' }}>
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                style={inputStyle}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onFocus={focusInput}
                onBlur={blurInput}
                placeholder="ex: Cuvée Prestige"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: '#5C5550' }}>
                Type <span className="text-red-500">*</span>
              </label>
              <select
                className={inputClass + ' cursor-pointer'}
                style={inputStyle}
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                onFocus={focusInput}
                onBlur={blurInput}
              >
                {Object.entries(TYPE_CONFIG).map(([v, { label }]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={{ color: '#5C5550' }}>Millésime</label>
              <input
                type="number"
                className={inputClass}
                style={inputStyle}
                value={form.vintage_year}
                onChange={e => setForm({ ...form, vintage_year: Number(e.target.value) })}
                onFocus={focusInput}
                onBlur={blurInput}
                min={1900}
                max={2100}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: '#5C5550' }}>Appellation</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={form.appellation}
              onChange={e => setForm({ ...form, appellation: e.target.value })}
              onFocus={focusInput}
              onBlur={blurInput}
              placeholder="ex: Bordeaux AOC"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={{ color: '#5C5550' }}>
                Volume initial (L) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className={inputClass}
                style={inputStyle}
                value={form.initial_volume_liters}
                onChange={e => setForm({ ...form, initial_volume_liters: e.target.value })}
                onFocus={focusInput}
                onBlur={blurInput}
                min={0}
                step={0.1}
                placeholder="ex: 5000"
                required
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: '#5C5550' }}>Date de vendange</label>
              <input
                type="date"
                className={inputClass}
                style={inputStyle}
                value={form.harvest_date}
                onChange={e => setForm({ ...form, harvest_date: e.target.value })}
                onFocus={focusInput}
                onBlur={blurInput}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: '#5C5550' }}>Notes</label>
            <textarea
              className={inputClass + ' resize-none h-20'}
              style={inputStyle}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              onFocus={focusInput}
              onBlur={blurInput}
              placeholder="Informations complémentaires…"
            />
          </div>

          {/* Footer actions — flex-wrap so buttons stack on very narrow screens */}
          <div
            className="flex flex-wrap gap-3 justify-end pt-2"
            style={{ borderTop: '1px solid #F0EDE8' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium bg-white shadow-sm transition-colors"
              style={{ color: '#5C5550', border: '1px solid #E8E4DE' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F9F8F6'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium text-white shadow-sm transition-all duration-200 disabled:opacity-60"
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
