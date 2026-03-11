import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Beaker, Plus } from 'lucide-react';

const OPERATION_TYPES: Record<string, string> = {
  sulfitage: 'Sulfitage',
  levurage: 'Levurage',
  collage: 'Collage',
  filtration: 'Filtration',
  malo: 'Fermentation malolactique',
  chaptalisation: 'Chaptalisation',
  acidification: 'Acidification',
  desacidification: 'Désacidification',
  flash_pasteurisation: 'Flash pasteurisation',
  micro_oxygenation: 'Micro-oxygénation',
  batonnage: 'Bâtonnage',
  autre: 'Autre',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  planned:     { label: 'Planifié',  bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  in_progress: { label: 'En cours',  bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  done:        { label: 'Terminé',   bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  cancelled:   { label: 'Annulé',    bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
};

function StatusBadge({ status }: { status: string }) {
  const conf = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ backgroundColor: conf.bg, color: conf.text, borderColor: conf.border }}
    >
      {conf.label}
    </span>
  );
}

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
    <div>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight flex items-center gap-2"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: '#1A1714' }}
            >
              <Beaker size={22} className="text-[#8B1A2F]" />
              Opérations
            </h1>
            <p className="text-sm mt-1" style={{ color: '#5C5550' }}>Traitements et opérations cave</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all duration-200"
            style={{ backgroundColor: '#8B1A2F' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#6F1526')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#8B1A2F')}
          >
            <Plus size={16} />
            Nouvelle opération
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select
            className="rounded-lg border border-[#E8E4DE] px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors duration-150 hover:bg-[#F5F3EF]"
            style={{ color: '#1A1714' }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>

        {/* Table card */}
        <div
          className="bg-white rounded-xl border border-[#E8E4DE] overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E4DE] bg-[#FDFCFA]">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>
                  Opération
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>
                  Lot
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>
                  Objectif
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#9B9590' }}>
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : operations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-sm" style={{ color: '#9B9590' }}>
                    <Beaker size={32} className="mx-auto mb-2 opacity-30" />
                    Aucune opération
                  </td>
                </tr>
              ) : (
                operations.map((op: any) => (
                  <tr
                    key={op.id}
                    className="border-b border-[#EDE9E3] last:border-0 transition-colors duration-100 hover:bg-[#F5F3EF]"
                  >
                    <td className="px-4 py-3 text-sm" style={{ color: '#5C5550' }}>
                      {new Date(op.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#5C5550' }}>
                      {OPERATION_TYPES[op.operation_type] || op.operation_type}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: '#1A1714' }}>{op.lot_number || '—'}</p>
                      {op.lot_name && (
                        <p className="text-xs mt-0.5" style={{ color: '#5C5550' }}>{op.lot_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate" style={{ color: '#5C5550' }}>
                      {op.purpose}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={op.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Create modal */}
        {showCreate && (
          <CreateOperationModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['operations'] });
              setShowCreate(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function CreateOperationModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: lots = [] } = useQuery({
    queryKey: ['lots-active'],
    queryFn: () => api<any[]>('/lots?status=active'),
  });
  const { data: containers = [] } = useQuery({
    queryKey: ['containers-all'],
    queryFn: () => api<any[]>('/containers'),
  });

  const [form, setForm] = useState({
    operation_type: 'sulfitage',
    lot_id: '',
    container_id: '',
    date: new Date().toISOString().split('T')[0],
    purpose: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/operations', { method: 'POST', body: JSON.stringify(form) });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm shadow-sm placeholder:text-[#9B9590] focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors duration-150 hover:bg-[#F5F3EF]';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl w-full max-w-md p-6 border border-[#E8E4DE]"
        style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
      >

        {/* Modal header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold" style={{ color: '#1A1714' }}>Nouvelle opération</h2>
          <button
            onClick={onClose}
            className="transition-colors duration-150 text-lg leading-none"
            style={{ color: '#9B9590' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#5C5550')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9B9590')}
          >
            ✕
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type d'opération */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#5C5550' }}>
              Type d'opération <span className="text-[#8B1A2F]">*</span>
            </label>
            <select
              className={inputClass}
              style={{ color: '#1A1714' }}
              value={form.operation_type}
              onChange={e => setForm({ ...form, operation_type: e.target.value })}
            >
              {Object.entries(OPERATION_TYPES).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Lot + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#5C5550' }}>Lot</label>
              <select
                className={inputClass}
                style={{ color: '#1A1714' }}
                value={form.lot_id}
                onChange={e => setForm({ ...form, lot_id: e.target.value })}
              >
                <option value="">—</option>
                {(lots as any[]).map((l: any) => (
                  <option key={l.id} value={l.id}>{l.lot_number}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#5C5550' }}>
                Date <span className="text-[#8B1A2F]">*</span>
              </label>
              <input
                type="date"
                className={inputClass}
                style={{ color: '#1A1714' }}
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Objectif */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#5C5550' }}>
              Objectif <span className="text-[#8B1A2F]">*</span>
            </label>
            <input
              className={inputClass}
              style={{ color: '#1A1714' }}
              value={form.purpose}
              onChange={e => setForm({ ...form, purpose: e.target.value })}
              required
              placeholder="ex: Ajuster le SO₂ libre"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#5C5550' }}>Notes</label>
            <textarea
              className={`${inputClass} resize-none h-20`}
              style={{ color: '#1A1714' }}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Observations complémentaires..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-white border border-[#E8E4DE] rounded-lg shadow-sm hover:bg-[#F5F3EF] transition-all duration-200"
              style={{ color: '#5C5550' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all duration-200 disabled:opacity-60"
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
  );
}
