import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Wrench, Plus, Calendar, List, X, AlertTriangle } from 'lucide-react';

const MAINTENANCE_TYPES: Record<string, string> = {
  cleaning: 'Nettoyage', repair: 'Réparation', inspection: 'Inspection',
  calibration: 'Calibration', replacement: 'Remplacement', autre: 'Autre'
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  planifie:    { label: 'Planifié',    bg: '#F0EDE8', text: '#5C5550', border: '#E8E4DE' },
  planned:     { label: 'Planifié',    bg: '#F0EDE8', text: '#5C5550', border: '#E8E4DE' },
  en_cours:    { label: 'En cours',    bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  in_progress: { label: 'En cours',    bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  termine:     { label: 'Terminé',     bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  done:        { label: 'Terminé',     bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  en_retard:   { label: 'En retard',   bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  overdue:     { label: 'En retard',   bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
};

function getStatusConf(status: string) {
  return STATUS_CONFIG[status] || { label: status, bg: '#F0EDE8', text: '#5C5550', border: '#E8E4DE' };
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
  const containerRef = useRef<HTMLDivElement>(null);

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

  useGSAP(() => {
    if (isLoading) return;
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('.maint-header', { y: -20, opacity: 0, duration: 0.5 });
    tl.from('.maint-stat', { y: 24, opacity: 0, stagger: 0.08, duration: 0.5 }, '-=0.2');
    tl.from('.maint-toolbar', { y: 16, opacity: 0, duration: 0.4 }, '-=0.2');

    gsap.from('.maint-content', {
      scrollTrigger: { trigger: '.maint-content', start: 'top 85%', once: true },
      y: 30, opacity: 0, duration: 0.6,
    });
  }, { scope: containerRef, dependencies: [isLoading, viewMode] });

  return (
    <div ref={containerRef} className="min-h-screen bg-[#F5F3EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="maint-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-bold text-[#1A1714] tracking-tight flex items-center gap-2"
              style={{ fontFamily: "'Cabinet Grotesk', 'Satoshi', sans-serif" }}
            >
              <Wrench size={22} className="text-[#8B1A2F]" />
              Maintenance
            </h1>
            <p className="text-sm text-[#5C5550] mt-1">
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
            { label: 'Total', value: filtered.length, color: '#5C5550', bg: '#F0EDE8' },
            {
              label: 'Planifiées',
              value: filtered.filter((m: any) => m.status === 'planifie' || m.status === 'planned').length,
              color: '#5C5550', bg: '#F0EDE8'
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
              className="maint-stat bg-white border border-[#E8E4DE] rounded-xl p-4 shadow-sm"
            >
              <p className="text-xs font-medium text-[#5C5550] uppercase tracking-wide mb-2">{stat.label}</p>
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="maint-toolbar flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            className="bg-white border border-[#E8E4DE] rounded-lg px-3 py-2 text-sm text-[#1A1714] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="planifie">Planifié</option>
            <option value="en_cours">En cours</option>
            <option value="done">Terminé</option>
            <option value="en_retard">En retard</option>
          </select>

          <div className="ml-auto flex items-center gap-1 bg-white border border-[#E8E4DE] rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-[#8B1A2F] text-white shadow-sm'
                  : 'text-[#5C5550] hover:text-[#1A1714] hover:bg-[#F0EDE8]'
              }`}
            >
              <List size={14} />
              <span className="sm:inline">Tableau</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 ${
                viewMode === 'calendar'
                  ? 'bg-[#8B1A2F] text-white shadow-sm'
                  : 'text-[#5C5550] hover:text-[#1A1714] hover:bg-[#F0EDE8]'
              }`}
            >
              <Calendar size={14} />
              <span className="sm:inline">Calendrier</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <>
            {/* Desktop Table — hidden on mobile */}
            <div className="maint-content hidden md:block bg-white border border-[#E8E4DE] rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="bg-[#F9F8F6] border-b border-[#E8E4DE]">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Contenant</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Type maintenance</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Description</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Date prévue</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Date réalisée</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Responsable</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E4DE]">
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={7} className="px-4 py-3">
                            <div className="h-4 bg-[#F0EDE8] rounded animate-pulse w-full" />
                          </td>
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3 text-[#9B9590]">
                            <div className="w-12 h-12 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                              <Wrench size={22} />
                            </div>
                            <p className="text-sm font-medium text-[#5C5550]">Aucune maintenance planifiée</p>
                            <p className="text-xs text-[#9B9590]">Planifiez une maintenance pour commencer</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filtered.map((m: any) => {
                        const overdue = isOverdue(m.scheduled_date, m.status);
                        return (
                          <tr key={m.id} className={`hover:bg-[#F9F8F6] transition-colors duration-100 ${overdue ? 'bg-red-50/40' : ''}`}>
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold text-[#1A1714]">{m.container_code}</p>
                              {m.container_name && (
                                <p className="text-xs text-[#5C5550]">{m.container_name}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-[#5C5550]">
                                {MAINTENANCE_TYPES[m.maintenance_type] || m.maintenance_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-[#5C5550] max-w-xs truncate">
                              {m.description || <span className="text-[#9B9590]">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {m.scheduled_date ? (
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-[#5C5550]'}`}>
                                    {new Date(m.scheduled_date).toLocaleDateString('fr-FR', {
                                      day: 'numeric', month: 'short', year: 'numeric'
                                    })}
                                  </span>
                                  {overdue && <AlertTriangle size={12} className="text-red-500 shrink-0" />}
                                </div>
                              ) : (
                                <span className="text-sm text-[#9B9590]">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#5C5550]">
                              {m.completed_date
                                ? new Date(m.completed_date).toLocaleDateString('fr-FR', {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                  })
                                : <span className="text-[#9B9590]">—</span>
                              }
                            </td>
                            <td className="px-4 py-3 text-sm text-[#5C5550]">
                              {m.technician || <span className="text-[#9B9590]">—</span>}
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

            {/* Mobile Card View — visible only on mobile */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white border border-[#E8E4DE] rounded-xl p-4 shadow-sm">
                    <div className="space-y-2">
                      <div className="h-4 bg-[#F0EDE8] rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-[#F0EDE8] rounded animate-pulse w-1/2" />
                      <div className="h-3 bg-[#F0EDE8] rounded animate-pulse w-full" />
                    </div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="bg-white border border-[#E8E4DE] rounded-xl shadow-sm text-center py-12">
                  <div className="flex flex-col items-center gap-3 text-[#9B9590]">
                    <div className="w-12 h-12 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                      <Wrench size={22} />
                    </div>
                    <p className="text-sm font-medium text-[#5C5550]">Aucune maintenance planifiée</p>
                    <p className="text-xs text-[#9B9590]">Planifiez une maintenance pour commencer</p>
                  </div>
                </div>
              ) : (
                filtered.map((m: any) => {
                  const overdue = isOverdue(m.scheduled_date, m.status);
                  return (
                    <div
                      key={m.id}
                      className={`bg-white border rounded-xl p-4 shadow-sm ${overdue ? 'border-red-200 bg-red-50/30' : 'border-[#E8E4DE]'}`}
                    >
                      {/* Card top: container + status */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1A1714] truncate">{m.container_code}</p>
                          {m.container_name && (
                            <p className="text-xs text-[#5C5550] truncate">{m.container_name}</p>
                          )}
                        </div>
                        <StatusBadge status={overdue ? 'en_retard' : m.status} />
                      </div>

                      {/* Type badge */}
                      <div className="mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-[#E8E4DE] bg-[#F9F8F6] text-[#5C5550]">
                          {MAINTENANCE_TYPES[m.maintenance_type] || m.maintenance_type}
                        </span>
                      </div>

                      {/* Description */}
                      {m.description && (
                        <p className="text-xs text-[#5C5550] mb-3 line-clamp-2">{m.description}</p>
                      )}

                      {/* Footer: date + technician */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F0EDE8]">
                        {m.scheduled_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar size={11} className={overdue ? 'text-red-500' : 'text-[#9B9590]'} />
                            <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-[#5C5550]'}`}>
                              {new Date(m.scheduled_date).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </span>
                            {overdue && <AlertTriangle size={11} className="text-red-500 shrink-0" />}
                          </div>
                        ) : (
                          <span className="text-xs text-[#9B9590]">Date non définie</span>
                        )}
                        {m.technician && (
                          <span className="text-xs text-[#9B9590] truncate max-w-[120px]">{m.technician}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="space-y-4 sm:space-y-6">
            {Object.keys(byMonth).length === 0 ? (
              <div className="bg-white border border-[#E8E4DE] rounded-xl shadow-sm text-center py-16">
                <div className="flex flex-col items-center gap-3 text-[#9B9590]">
                  <div className="w-12 h-12 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                    <Calendar size={22} />
                  </div>
                  <p className="text-sm font-medium text-[#5C5550]">Aucune maintenance planifiée</p>
                </div>
              </div>
            ) : (
              Object.entries(byMonth).map(([month, items]) => (
                <div key={month} className="bg-white border border-[#E8E4DE] rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 sm:px-5 py-3 bg-[#F9F8F6] border-b border-[#E8E4DE] flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#1A1714] capitalize">{month}</h3>
                    <span className="text-xs text-[#5C5550]">{items.length} tâche{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-[#E8E4DE]">
                    {items.map((m: any) => {
                      const overdue = isOverdue(m.scheduled_date, m.status);
                      return (
                        <div key={m.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 hover:bg-[#F9F8F6] transition-colors duration-100">
                          <div className="text-center w-9 sm:w-10 shrink-0">
                            <p className="text-base sm:text-lg font-bold text-[#1A1714] leading-none">
                              {new Date(m.scheduled_date).getDate()}
                            </p>
                            <p className="text-xs text-[#9B9590] uppercase">
                              {new Date(m.scheduled_date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                            </p>
                          </div>

                          <div className="w-px h-10 bg-[#E8E4DE] shrink-0" />

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                              <p className="text-sm font-semibold text-[#1A1714]">{m.container_code}</p>
                              <span className="text-xs text-[#9B9590] hidden sm:inline">·</span>
                              <p className="text-xs sm:text-sm text-[#5C5550]">
                                {MAINTENANCE_TYPES[m.maintenance_type] || m.maintenance_type}
                              </p>
                            </div>
                            {m.description && (
                              <p className="text-xs text-[#5C5550] mt-0.5 truncate">{m.description}</p>
                            )}
                            {m.technician && (
                              <p className="text-xs text-[#9B9590] mt-0.5">{m.technician}</p>
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

  const inputClass = "w-full bg-white border border-[#E8E4DE] rounded-lg px-3 py-2 text-sm text-[#1A1714] placeholder-[#9B9590] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors";
  const labelClass = "block text-sm font-medium text-[#5C5550] mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-[#E8E4DE] shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#E8E4DE]">
          <h2 className="text-lg font-semibold text-[#1A1714]">Planifier une maintenance</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9B9590] hover:text-[#5C5550] hover:bg-[#F0EDE8] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium text-[#5C5550] bg-white border border-[#E8E4DE] hover:bg-[#F9F8F6] shadow-sm transition-all duration-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all duration-200 disabled:opacity-60"
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
