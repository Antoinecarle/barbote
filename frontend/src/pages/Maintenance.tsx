import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Wrench, Plus, Calendar, List, X, AlertTriangle } from 'lucide-react';

const MAINTENANCE_TYPES: Record<string, string> = {
  cleaning: 'Nettoyage', repair: 'Réparation', inspection: 'Inspection',
  calibration: 'Calibration', replacement: 'Remplacement', autre: 'Autre'
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  planifie:    { label: 'Planifié',    bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  planned:     { label: 'Planifié',    bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  en_cours:    { label: 'En cours',    bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  in_progress: { label: 'En cours',    bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  termine:     { label: 'Terminé',     bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  done:        { label: 'Terminé',     bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  en_retard:   { label: 'En retard',   bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  overdue:     { label: 'En retard',   bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
};

function getStatusConf(status: string) {
  return STATUS_CONFIG[status] || { label: status, bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' };
}

function StatusBadge({ status }: { status: string }) {
  const conf = getStatusConf(status);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ backgroundColor: conf.bg, color: conf.text, borderColor: conf.border }}
    >
      {conf.label}
    </span>
  );
}

function isOverdue(scheduledDate: string | null, status: string): boolean {
  if (!scheduledDate) return false;
  if (status === 'done' || status === 'termine') return false;
  return new Date(scheduledDate) < new Date();
}

export default function Maintenance() {
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const queryClient = useQueryClient();

  const { data: maintenance = [], isLoading } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => api<any[]>('/maintenance'),
  });

  const filtered = filterStatus
    ? maintenance.filter((m: any) => m.status === filterStatus)
    : maintenance;

  const overdueCount = filtered.filter((m: any) =>
    isOverdue(m.scheduled_date, m.status)
  ).length;

  // Group by month for calendar view
  const byMonth: Record<string, any[]> = {};
  filtered.forEach((m: any) => {
    if (!m.scheduled_date) return;
    const key = new Date(m.scheduled_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(m);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Wrench size={22} className="text-[#8B1A2F]" />
              Maintenance
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Maintenance et entretien des contenants
              {overdueCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-red-600 font-medium">
                  <AlertTriangle size={12} />
                  {overdueCount} en retard
                </span>
              )}
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
            Nouvelle maintenance
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: filtered.length, color: '#6B7280', bg: '#F3F4F6' },
            {
              label: 'Planifiées',
              value: filtered.filter((m: any) => m.status === 'planifie' || m.status === 'planned').length,
              color: '#4B5563', bg: '#F3F4F6'
            },
            {
              label: 'En cours',
              value: filtered.filter((m: any) => m.status === 'en_cours' || m.status === 'in_progress').length,
              color: '#1D4ED8', bg: '#EFF6FF'
            },
            {
              label: 'En retard',
              value: overdueCount,
              color: '#DC2626', bg: '#FEF2F2'
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="planifie">Planifié</option>
            <option value="en_cours">En cours</option>
            <option value="done">Terminé</option>
            <option value="en_retard">En retard</option>
          </select>

          <div className="ml-auto flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
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
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                viewMode === 'calendar'
                  ? 'bg-[#8B1A2F] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Calendar size={14} />
              Calendrier
            </button>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contenant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type maintenance</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date prévue</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date réalisée</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsable</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <Wrench size={22} />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Aucune maintenance planifiée</p>
                        <p className="text-xs text-gray-400">Planifiez une maintenance pour commencer</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((m: any) => {
                    const overdue = isOverdue(m.scheduled_date, m.status);
                    return (
                      <tr key={m.id} className={`hover:bg-gray-50 transition-colors duration-100 ${overdue ? 'bg-red-50/40' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-gray-900">{m.container_code}</p>
                          {m.container_name && (
                            <p className="text-xs text-gray-500">{m.container_name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">
                            {MAINTENANCE_TYPES[m.maintenance_type] || m.maintenance_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {m.description || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {m.scheduled_date ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                                {new Date(m.scheduled_date).toLocaleDateString('fr-FR', {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                })}
                              </span>
                              {overdue && <AlertTriangle size={12} className="text-red-500 shrink-0" />}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {m.completed_date
                            ? new Date(m.completed_date).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })
                            : <span className="text-gray-400">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {m.technician || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={overdue ? 'en_retard' : m.status} />
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

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="space-y-6">
            {Object.keys(byMonth).length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm text-center py-16">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Calendar size={22} />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Aucune maintenance planifiée</p>
                </div>
              </div>
            ) : (
              Object.entries(byMonth).map(([month, items]) => (
                <div key={month} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 capitalize">{month}</h3>
                    <span className="text-xs text-gray-500">{items.length} tâche{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map((m: any) => {
                      const overdue = isOverdue(m.scheduled_date, m.status);
                      return (
                        <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors duration-100">
                          <div className="text-center w-10 shrink-0">
                            <p className="text-lg font-bold text-gray-900 leading-none">
                              {new Date(m.scheduled_date).getDate()}
                            </p>
                            <p className="text-xs text-gray-400 uppercase">
                              {new Date(m.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                            </p>
                          </div>

                          <div className="w-px h-10 bg-gray-200 shrink-0" />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900">{m.container_code}</p>
                              <span className="text-xs text-gray-400">·</span>
                              <p className="text-sm text-gray-600">
                                {MAINTENANCE_TYPES[m.maintenance_type] || m.maintenance_type}
                              </p>
                            </div>
                            {m.description && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{m.description}</p>
                            )}
                            {m.technician && (
                              <p className="text-xs text-gray-400 mt-0.5">{m.technician}</p>
                            )}
                          </div>

                          <StatusBadge status={overdue ? 'en_retard' : m.status} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateMaintenanceModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['maintenance'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function CreateMaintenanceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: containers = [] } = useQuery({
    queryKey: ['containers-all'],
    queryFn: () => api<any[]>('/containers')
  });
  const [form, setForm] = useState({
    container_id: '', maintenance_type: 'cleaning', scheduled_date: '',
    description: '', technician: '', cost: '', notes: ''
  });
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
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Planifier une maintenance</h2>
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
            <div>
              <label className={labelClass}>Contenant *</label>
              <select
                className={inputClass}
                value={form.container_id}
                onChange={e => setForm({ ...form, container_id: e.target.value })}
                required
              >
                <option value="">Sélectionner un contenant</option>
                {(containers as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Type *</label>
                <select
                  className={inputClass}
                  value={form.maintenance_type}
                  onChange={e => setForm({ ...form, maintenance_type: e.target.value })}
                >
                  {Object.entries(MAINTENANCE_TYPES).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Date planifiée</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.scheduled_date}
                  onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Description *</label>
              <textarea
                className={`${inputClass} resize-none h-20`}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Décrivez la maintenance à effectuer..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Technicien</label>
                <input
                  className={inputClass}
                  value={form.technician}
                  onChange={e => setForm({ ...form, technician: e.target.value })}
                  placeholder="Nom du technicien"
                />
              </div>
              <div>
                <label className={labelClass}>Coût estimé (€)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.cost}
                  onChange={e => setForm({ ...form, cost: e.target.value })}
                  placeholder="0"
                />
              </div>
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
                {loading ? 'Planification...' : 'Planifier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
