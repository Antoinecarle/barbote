import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
  const container = useRef<HTMLDivElement>(null);

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

  useGSAP(() => {
    if (isLoading) return;
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('.containers-header', { y: -20, opacity: 0, duration: 0.5 });
    tl.from('.containers-filters', { y: 16, opacity: 0, duration: 0.4 }, '-=0.2');
    tl.from('.container-card', { y: 24, opacity: 0, stagger: 0.08, duration: 0.5 }, '-=0.2');

    gsap.from('.containers-table', {
      scrollTrigger: { trigger: '.containers-table', start: 'top 85%', once: true },
      y: 30, opacity: 0, duration: 0.6,
    });
  }, { scope: container, dependencies: [isLoading, viewMode] });

  return (
    <div ref={container} className="min-h-screen bg-[#F5F3EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6">

        {/* Header */}
        <div className="containers-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight flex items-center gap-2"
              style={{
                color: '#1A1714',
                fontFamily: "'Cabinet Grotesk', 'Satoshi', system-ui, sans-serif",
              }}
            >
              <Package size={22} className="text-[#8B1A2F]" />
              Contenants
            </h1>
            <p className="text-sm mt-1" style={{ color: '#9B9590' }}>
              {filtered.length} contenant{filtered.length !== 1 ? 's' : ''}
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
            <span className="hidden sm:inline">Nouveau </span>Contenant
          </button>
        </div>

        {/* Filters */}
        <div className="containers-filters space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          {/* Row 1: Search (full width on mobile) */}
          <div className="relative w-full sm:flex-1 sm:min-w-0" style={{ maxWidth: '320px' }}>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9B9590' }} />
            <input
              className="w-full pl-9 pr-3 py-2.5 sm:py-2 bg-white rounded-lg text-sm shadow-sm focus:outline-none transition-colors"
              style={{
                border: '1px solid #E8E4DE',
                color: '#5C5550',
              }}
              placeholder="Rechercher un contenant..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E8E4DE'; e.currentTarget.style.boxShadow = ''; }}
            />
          </div>
          {/* Row 2: Selects + view toggle (on mobile) */}
          <div className="flex items-center gap-2 sm:contents">
            <select
              className="flex-1 sm:flex-none bg-white rounded-lg px-3 py-2.5 sm:py-2 text-sm shadow-sm focus:outline-none transition-colors min-h-[44px] sm:min-h-0"
              style={{ border: '1px solid #E8E4DE', color: '#5C5550' }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E8E4DE'; e.currentTarget.style.boxShadow = ''; }}
            >
              <option value="">Tous statuts</option>
              {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <select
              className="flex-1 sm:flex-none bg-white rounded-lg px-3 py-2.5 sm:py-2 text-sm shadow-sm focus:outline-none transition-colors min-h-[44px] sm:min-h-0"
              style={{ border: '1px solid #E8E4DE', color: '#5C5550' }}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              onFocus={e => { e.currentTarget.style.borderColor = '#8B1A2F'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E8E4DE'; e.currentTarget.style.boxShadow = ''; }}
            >
              <option value="">Tous types</option>
              {Object.entries(CONTAINER_TYPES).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>

            <div
              className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm shrink-0"
              style={{ border: '1px solid #E8E4DE' }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 min-h-[36px]"
                style={
                  viewMode === 'grid'
                    ? { backgroundColor: '#8B1A2F', color: '#ffffff' }
                    : { color: '#9B9590' }
                }
                onMouseEnter={e => { if (viewMode !== 'grid') e.currentTarget.style.color = '#5C5550'; }}
                onMouseLeave={e => { if (viewMode !== 'grid') e.currentTarget.style.color = '#9B9590'; }}
                title="Vue grille"
              >
                <Grid3X3 size={14} />
                <span className="hidden sm:inline">Grille</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 min-h-[36px]"
                style={
                  viewMode === 'table'
                    ? { backgroundColor: '#8B1A2F', color: '#ffffff' }
                    : { color: '#9B9590' }
                }
                onMouseEnter={e => { if (viewMode !== 'table') e.currentTarget.style.color = '#5C5550'; }}
                onMouseLeave={e => { if (viewMode !== 'table') e.currentTarget.style.color = '#9B9590'; }}
                title="Vue tableau"
              >
                <List size={14} />
                <span className="hidden sm:inline">Tableau</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-5 shadow-sm animate-pulse"
                  style={{ border: '1px solid #E8E4DE' }}
                >
                  <div className="h-20 rounded" style={{ backgroundColor: '#F0EDE8' }} />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="col-span-3 text-center py-16">
                <div className="flex flex-col items-center gap-3" style={{ color: '#9B9590' }}>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#F0EDE8' }}
                  >
                    <Package size={22} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: '#9B9590' }}>Aucun contenant trouvé</p>
                  <p className="text-xs" style={{ color: '#C4BEB8' }}>Modifiez vos filtres ou ajoutez un contenant</p>
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
                    className="container-card bg-white rounded-xl p-5 cursor-pointer transition-all duration-200"
                    style={{
                      border: '1px solid #E8E4DE',
                      boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#D4CEC6';
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        '0 4px 8px rgba(26,23,20,0.10), 0 8px 20px rgba(26,23,20,0.08)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#E8E4DE';
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)';
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#FDF2F4] flex items-center justify-center border border-[#F3C5CE]">
                          <Package size={16} className="text-[#8B1A2F]" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight" style={{ color: '#1A1714' }}>{c.code}</p>
                          <p className="text-xs" style={{ color: '#9B9590' }}>{c.name}</p>
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{ backgroundColor: '#F0EDE8', color: '#5C5550' }}
                      >
                        {CONTAINER_TYPES[c.type] || c.type}
                      </span>
                      {c.location && (
                        <span className="text-xs" style={{ color: '#9B9590' }}>{c.location}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5" style={{ color: '#9B9590' }}>
                        <span>Remplissage</span>
                        <span className="font-medium" style={{ color: '#5C5550' }}>
                          {Number(c.current_volume_liters || 0).toLocaleString('fr')} / {Number(c.capacity_liters).toLocaleString('fr')} L
                        </span>
                      </div>
                      <div
                        className="w-full rounded-full h-1.5 overflow-hidden"
                        style={{ backgroundColor: '#F0EDE8' }}
                      >
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
          <div
            className="containers-table bg-white rounded-xl overflow-hidden"
            style={{
              border: '1px solid #E8E4DE',
              boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)',
            }}
          >
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr style={{ backgroundColor: '#F9F8F6', borderBottom: '1px solid #E8E4DE' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>Contenant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>Emplacement</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>Capacité</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>Remplissage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>Lot(s)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F0EDE8' }}>
                      <td colSpan={7} className="px-4 py-3">
                        <div
                          className="h-4 rounded animate-pulse w-full"
                          style={{ backgroundColor: '#F0EDE8' }}
                        />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14">
                      <div className="flex flex-col items-center gap-2" style={{ color: '#9B9590' }}>
                        <Package size={28} />
                        <p className="text-sm" style={{ color: '#9B9590' }}>Aucun contenant trouvé</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c: any) => {
                    const fillPercent = c.capacity_liters > 0
                      ? Math.min(100, (c.current_volume_liters / c.capacity_liters) * 100)
                      : 0;
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-[#F9F8F6] transition-colors duration-100"
                        style={{ borderBottom: '1px solid #F0EDE8' }}
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold" style={{ color: '#1A1714' }}>{c.code}</p>
                          <p className="text-xs" style={{ color: '#9B9590' }}>{c.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#5C5550' }}>
                          {CONTAINER_TYPES[c.type] || c.type}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#9B9590' }}>
                          {c.location || <span style={{ color: '#C4BEB8' }}>—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium" style={{ color: '#5C5550' }}>
                          {Number(c.capacity_liters).toLocaleString('fr')} L
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex-1 rounded-full h-1.5 overflow-hidden min-w-16"
                              style={{ backgroundColor: '#F0EDE8' }}
                            >
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${fillPercent}%`,
                                  backgroundColor: fillPercent > 80 ? '#15803D' : '#8B1A2F'
                                }}
                              />
                            </div>
                            <span className="text-xs whitespace-nowrap" style={{ color: '#9B9590' }}>
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
                                <span className="text-xs" style={{ color: '#9B9590' }}>+{c.current_lots.length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm" style={{ color: '#C4BEB8' }}>—</span>
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

  const inputBaseStyle: React.CSSProperties = {
    border: '1px solid #E8E4DE',
    color: '#1A1714',
    backgroundColor: '#ffffff',
  };

  const inputClass = "w-full bg-white rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none transition-colors";
  const labelClass = "block text-sm font-medium mb-1";

  const focusInput = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#8B1A2F';
    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,26,47,0.15)';
  };
  const blurInput = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#E8E4DE';
    e.currentTarget.style.boxShadow = '';
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md"
        style={{ border: '1px solid #E8E4DE' }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid #E8E4DE' }}
        >
          <h2
            className="text-lg font-semibold"
            style={{
              color: '#1A1714',
              fontFamily: "'Cabinet Grotesk', 'Satoshi', system-ui, sans-serif",
            }}
          >
            Nouveau contenant
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#9B9590' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#5C5550'; e.currentTarget.style.backgroundColor = '#F0EDE8'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9B9590'; e.currentTarget.style.backgroundColor = ''; }}
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
                <label className={labelClass} style={{ color: '#5C5550' }}>Code *</label>
                <input
                  className={inputClass}
                  style={inputBaseStyle}
                  value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value })}
                  onFocus={focusInput}
                  onBlur={blurInput}
                  placeholder="CUV-01"
                  required
                />
              </div>
              <div>
                <label className={labelClass} style={{ color: '#5C5550' }}>Nom *</label>
                <input
                  className={inputClass}
                  style={inputBaseStyle}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  onFocus={focusInput}
                  onBlur={blurInput}
                  placeholder="Cuve principale"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} style={{ color: '#5C5550' }}>Type</label>
                <select
                  className={inputClass}
                  style={inputBaseStyle}
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  onFocus={focusInput}
                  onBlur={blurInput}
                >
                  {Object.entries(CONTAINER_TYPES).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} style={{ color: '#5C5550' }}>Capacité (L) *</label>
                <input
                  type="number"
                  className={inputClass}
                  style={inputBaseStyle}
                  value={form.capacity_liters}
                  onChange={e => setForm({ ...form, capacity_liters: e.target.value })}
                  onFocus={focusInput}
                  onBlur={blurInput}
                  min={0}
                  placeholder="5000"
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass} style={{ color: '#5C5550' }}>Emplacement</label>
              <input
                className={inputClass}
                style={inputBaseStyle}
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                onFocus={focusInput}
                onBlur={blurInput}
                placeholder="Cave A, Rang 3..."
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white shadow-sm transition-all duration-200"
                style={{ color: '#5C5550', border: '1px solid #E8E4DE' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F9F8F6'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
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
