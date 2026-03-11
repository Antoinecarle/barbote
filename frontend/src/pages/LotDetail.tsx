import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  ArrowLeft, Wine, FlaskConical, ArrowLeftRight, GitBranch, Package,
} from 'lucide-react';

interface LotDetail {
  id: string;
  lot_number: string;
  name: string;
  type: string;
  appellation: string;
  vintage_year: number;
  grape_varieties: Array<{ variety: string; percentage: number }>;
  initial_volume_liters: number;
  current_volume_liters: number;
  status: string;
  quality_score?: number;
  harvest_date?: string;
  notes?: string;
  analysis_matrix: Record<string, number>;
  parent_lots: Array<{ lot_id: string; percentage: number; volume: number }>;
  parent_lot_details: Array<{ id: string; lot_number: string; name: string; type: string; vintage_year: number }>;
  movements: Array<any>;
  analyses: Array<any>;
  containers: Array<any>;
}

const ANALYSIS_LABELS: Record<string, { label: string; unit: string; min?: number; max?: number }> = {
  alcohol_percent:      { label: 'Alcool',            unit: '%',    min: 9,   max: 15  },
  total_acidity_gl:     { label: 'Acidité totale',    unit: 'g/L',  min: 3.5, max: 9   },
  volatile_acidity_gl:  { label: 'Acidité volatile',  unit: 'g/L',  min: 0,   max: 0.6 },
  ph:                   { label: 'pH',                unit: '',     min: 3.0, max: 4.0 },
  free_so2_mgl:         { label: 'SO₂ libre',         unit: 'mg/L', min: 15,  max: 40  },
  total_so2_mgl:        { label: 'SO₂ total',         unit: 'mg/L', min: 0,   max: 200 },
  residual_sugar_gl:    { label: 'Sucres résiduels',  unit: 'g/L',  min: 0,   max: 50  },
};

const MOVEMENT_LABELS: Record<string, string> = {
  entree:      'Entrée',
  sortie:      'Sortie',
  transfert:   'Transfert',
  assemblage:  'Assemblage',
  soutirage:   'Soutirage',
  filtration:  'Filtration',
  collage:     'Collage',
  perte:       'Perte',
  bottling:    'Mise en bouteille',
  sulfitage:   'Sulfitage',
  levurage:    'Levurage',
  malo:        'Fermentation malolactique',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  active:   { label: 'Actif',            bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  bottled:  { label: 'Mis en bouteille', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  archived: { label: 'Archivé',          bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  sold:     { label: 'Vendu',            bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  spoiled:  { label: 'Perdu',            bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
};

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  rouge:     { label: 'Rouge',     color: '#8B1A2F', bg: '#FDF2F4' },
  blanc:     { label: 'Blanc',     color: '#D97706', bg: '#FFFBEB' },
  rose:      { label: 'Rosé',      color: '#DB2777', bg: '#FDF2F8' },
  petillant: { label: 'Pétillant', color: '#1D4ED8', bg: '#EFF6FF' },
  mousseux:  { label: 'Mousseux',  color: '#7C3AED', bg: '#F5F3FF' },
  muté:      { label: 'Muté',      color: '#C2410C', bg: '#FFF7ED' },
  autre:     { label: 'Autre',     color: '#6B7280', bg: '#F3F4F6' },
};

type TabKey = 'overview' | 'analyses' | 'movements' | 'traceability';

export default function LotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('overview');

  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot', id],
    queryFn: () => api<LotDetail>(`/lots/${id}`),
    enabled: !!id,
  });

  const { data: traceability } = useQuery({
    queryKey: ['lot-traceability', id],
    queryFn: () => api<any>(`/lots/${id}/traceability`),
    enabled: !!id && tab === 'traceability',
  });

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[#E8E4DE] rounded-lg" />
        <div className="h-64 w-full bg-[#E8E4DE] rounded-xl" />
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Wine size={40} className="mx-auto mb-3 text-[#9B9590]" />
          <p className="text-sm text-[#5C5550]">Lot non trouvé</p>
        </div>
      </div>
    );
  }

  const typeConf   = TYPE_CONFIG[lot.type]   || TYPE_CONFIG.autre;
  const statusConf = STATUS_CONFIG[lot.status] || STATUS_CONFIG.active;
  const volumePct  = lot.initial_volume_liters > 0
    ? Math.min(100, (lot.current_volume_liters / lot.initial_volume_liters) * 100)
    : 0;
  const latestAnalysis = lot.analyses[0];

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview',     label: 'Informations', icon: Wine         },
    { key: 'analyses',     label: 'Analyses',     icon: FlaskConical },
    { key: 'movements',    label: 'Mouvements',   icon: ArrowLeftRight },
    { key: 'traceability', label: 'Traçabilité',  icon: GitBranch    },
  ];

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/lots')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#5C5550] bg-white border border-[#E8E4DE] hover:bg-[#F5F3EF] shadow-sm transition-colors flex-shrink-0 sm:mt-0.5"
          >
            <ArrowLeft size={14} />
            Retour
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 flex-wrap">
              <h1
                className="text-xl sm:text-2xl font-semibold tracking-tight min-w-0 break-words"
                style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: '#1A1714' }}
              >
                {lot.lot_number}
                <span className="font-normal mx-2" style={{ color: '#9B9590' }}>—</span>
                {lot.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span
                  className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full border"
                  style={{ backgroundColor: statusConf.bg, color: statusConf.text, borderColor: statusConf.border }}
                >
                  {statusConf.label}
                </span>
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: typeConf.bg, color: typeConf.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: typeConf.color }} />
                  {typeConf.label}
                </span>
              </div>
            </div>
            <p className="text-sm text-[#5C5550] mt-1">
              {[lot.appellation, lot.vintage_year && `Millésime ${lot.vintage_year}`]
                .filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#E8E4DE] bg-white rounded-t-xl px-2">
          <nav className="flex -mb-px gap-1 overflow-x-auto scrollbar-none">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors min-h-[44px] whitespace-nowrap flex-shrink-0 ${
                  tab === key
                    ? 'border-[#8B1A2F] text-[#8B1A2F]'
                    : 'border-transparent text-[#5C5550] hover:text-[#1A1714] hover:border-[#E8E4DE]'
                }`}
              >
                <Icon size={14} />
                <span className="hidden xs:inline sm:inline">{label}</span>
                <span className="xs:hidden sm:hidden inline">{label.substring(0, 4)}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* ─── OVERVIEW ─── */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main info card */}
            <div
              className="xl:col-span-2 bg-white rounded-xl border border-[#E8E4DE] p-4 sm:p-6 space-y-6"
              style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
            >
              <h2 className="text-sm font-semibold text-[#1A1714]">Informations générales</h2>

              {/* Volume */}
              <div>
                <p className="text-xs font-medium text-[#5C5550] uppercase tracking-wide mb-2">Volume</p>
                <div className="flex items-end gap-3 flex-wrap">
                  <p className="text-3xl font-bold text-[#1A1714]">
                    {Number(lot.current_volume_liters).toLocaleString('fr')}
                    <span className="text-lg font-medium text-[#5C5550] ml-1">L</span>
                  </p>
                  <p className="text-sm text-[#5C5550] mb-1">
                    sur {Number(lot.initial_volume_liters).toLocaleString('fr')} L initial
                  </p>
                </div>
                <div className="w-full bg-[#EDE9E3] rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${volumePct}%`, backgroundColor: typeConf.color }}
                  />
                </div>
                <p className="text-xs text-[#9B9590] mt-1">{Math.round(volumePct)}% du volume initial</p>
              </div>

              {/* Grape varieties */}
              {lot.grape_varieties?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#5C5550] uppercase tracking-wide mb-2">Cépages</p>
                  <div className="space-y-1.5">
                    {lot.grape_varieties.map((g, i) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-[#5C5550] min-w-0 truncate">{g.variety}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-20 sm:w-24 bg-[#EDE9E3] rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{ width: `${g.percentage}%`, backgroundColor: typeConf.color }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[#5C5550] w-8 text-right">{g.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current containers */}
              <div>
                <p className="text-xs font-medium text-[#5C5550] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Package size={11} />
                  Contenants actuels
                </p>
                {lot.containers.filter((c: any) => c.is_current).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {lot.containers.filter((c: any) => c.is_current).map((c: any) => (
                      <div
                        key={c.container_id || c.id}
                        className="border border-[#E8E4DE] rounded-lg p-3 bg-[#FDFCFA]"
                      >
                        <p className="text-sm font-medium text-[#1A1714]">{c.code}</p>
                        <p className="text-xs text-[#5C5550] mt-0.5">{c.name}</p>
                        <p
                          className="text-xs font-medium mt-1"
                          style={{ color: typeConf.color }}
                        >
                          {Number(c.volume_liters || 0).toLocaleString('fr')} L
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#9B9590]">Aucun contenant assigné</p>
                )}
              </div>

              {/* Notes */}
              {lot.notes && (
                <div>
                  <p className="text-xs font-medium text-[#5C5550] uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-sm text-[#5C5550] bg-[#FDFCFA] border border-[#E8E4DE] rounded-lg px-4 py-3">
                    {lot.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Latest analysis card */}
              <div
                className="bg-white rounded-xl border border-[#E8E4DE] p-4 sm:p-5"
                style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
              >
                <h2 className="text-sm font-semibold text-[#1A1714] mb-3">Dernière analyse</h2>
                {latestAnalysis ? (
                  <>
                    <p className="text-xs text-[#5C5550] mb-3">
                      {new Date(latestAnalysis.analysis_date).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                      {latestAnalysis.lab_name && ` · ${latestAnalysis.lab_name}`}
                    </p>
                    <div className="space-y-2">
                      {Object.entries(ANALYSIS_LABELS).map(([key, config]) => {
                        const val = latestAnalysis[key];
                        if (!val) return null;
                        return (
                          <div key={key} className="flex justify-between items-center py-1 border-b border-[#EDE9E3] last:border-0">
                            <span className="text-xs text-[#5C5550]">{config.label}</span>
                            <span className="text-sm font-medium text-[#1A1714]">
                              {val} {config.unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <FlaskConical size={24} className="mx-auto mb-2 text-[#9B9590]" />
                    <p className="text-sm text-[#9B9590]">Aucune analyse disponible</p>
                  </div>
                )}
              </div>

              {/* Parent lots card */}
              {lot.parent_lot_details?.length > 0 && (
                <div
                  className="bg-white rounded-xl border border-[#E8E4DE] p-4 sm:p-5"
                  style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
                >
                  <h2 className="text-sm font-semibold text-[#1A1714] mb-3">Issu de</h2>
                  <div className="space-y-2">
                    {lot.parent_lot_details.map(p => {
                      const pType = TYPE_CONFIG[p.type] || TYPE_CONFIG.autre;
                      return (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/lots/${p.id}`)}
                          className="w-full text-left border border-[#E8E4DE] hover:border-[#E8E4DE] rounded-lg p-3 hover:bg-[#F5F3EF] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: pType.color }}
                            />
                            <p className="text-xs font-semibold text-[#1A1714]">{p.lot_number}</p>
                          </div>
                          <p className="text-xs text-[#5C5550] mt-0.5 ml-4">{p.name} · {p.vintage_year}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ANALYSES ─── */}
        {tab === 'analyses' && (
          <>
            {/* Desktop table */}
            <div
              className="hidden sm:block bg-white rounded-xl border border-[#E8E4DE] overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#FDFCFA] border-b border-[#E8E4DE]">
                      {['Date', 'Type', 'Alcool', 'Acid. tot.', 'Acid. vol.', 'pH', 'SO₂ L', 'SO₂ T'].map((col, i) => (
                        <th
                          key={col}
                          className={`px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide ${
                            i >= 2 ? 'text-right' : 'text-left'
                          }`}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE9E3]">
                    {lot.analyses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12">
                          <FlaskConical size={28} className="mx-auto mb-2 text-[#9B9590]" />
                          <p className="text-sm text-[#9B9590]">Aucune analyse enregistrée</p>
                        </td>
                      </tr>
                    ) : (
                      lot.analyses.map((a: any) => (
                        <tr key={a.id} className="hover:bg-[#F5F3EF] transition-colors">
                          <td className="px-4 py-3 text-sm text-[#1A1714]">
                            {new Date(a.analysis_date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#5C5550] capitalize">{a.analysis_type}</td>
                          <td className="px-4 py-3 text-right text-sm text-[#1A1714]">
                            {a.alcohol_percent ? `${a.alcohol_percent}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-[#1A1714]">
                            {a.total_acidity_gl || '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-[#1A1714]">
                            {a.volatile_acidity_gl || '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-[#1A1714]">{a.ph || '—'}</td>
                          <td className="px-4 py-3 text-right text-sm text-[#1A1714]">{a.free_so2_mgl || '—'}</td>
                          <td className="px-4 py-3 text-right text-sm text-[#1A1714]">{a.total_so2_mgl || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {lot.analyses.length === 0 ? (
                <div
                  className="bg-white rounded-xl border border-[#E8E4DE] p-8 text-center"
                  style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
                >
                  <FlaskConical size={28} className="mx-auto mb-2 text-[#9B9590]" />
                  <p className="text-sm text-[#9B9590]">Aucune analyse enregistrée</p>
                </div>
              ) : (
                lot.analyses.map((a: any) => (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl border border-[#E8E4DE] p-4 space-y-3"
                    style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#1A1714]">
                        {new Date(a.analysis_date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-xs text-[#5C5550] capitalize bg-[#F5F3EF] px-2 py-0.5 rounded-full">
                        {a.analysis_type}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {a.alcohol_percent && (
                        <div className="bg-[#FDFCFA] border border-[#E8E4DE] rounded-lg p-2">
                          <p className="text-xs text-[#9B9590]">Alcool</p>
                          <p className="text-sm font-medium text-[#1A1714]">{a.alcohol_percent}%</p>
                        </div>
                      )}
                      {a.ph && (
                        <div className="bg-[#FDFCFA] border border-[#E8E4DE] rounded-lg p-2">
                          <p className="text-xs text-[#9B9590]">pH</p>
                          <p className="text-sm font-medium text-[#1A1714]">{a.ph}</p>
                        </div>
                      )}
                      {a.total_acidity_gl && (
                        <div className="bg-[#FDFCFA] border border-[#E8E4DE] rounded-lg p-2">
                          <p className="text-xs text-[#9B9590]">Acid. totale</p>
                          <p className="text-sm font-medium text-[#1A1714]">{a.total_acidity_gl} g/L</p>
                        </div>
                      )}
                      {a.volatile_acidity_gl && (
                        <div className="bg-[#FDFCFA] border border-[#E8E4DE] rounded-lg p-2">
                          <p className="text-xs text-[#9B9590]">Acid. volatile</p>
                          <p className="text-sm font-medium text-[#1A1714]">{a.volatile_acidity_gl} g/L</p>
                        </div>
                      )}
                      {a.free_so2_mgl && (
                        <div className="bg-[#FDFCFA] border border-[#E8E4DE] rounded-lg p-2">
                          <p className="text-xs text-[#9B9590]">SO₂ libre</p>
                          <p className="text-sm font-medium text-[#1A1714]">{a.free_so2_mgl} mg/L</p>
                        </div>
                      )}
                      {a.total_so2_mgl && (
                        <div className="bg-[#FDFCFA] border border-[#E8E4DE] rounded-lg p-2">
                          <p className="text-xs text-[#9B9590]">SO₂ total</p>
                          <p className="text-sm font-medium text-[#1A1714]">{a.total_so2_mgl} mg/L</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ─── MOVEMENTS ─── */}
        {tab === 'movements' && (
          <>
            {/* Desktop table */}
            <div
              className="hidden sm:block bg-white rounded-xl border border-[#E8E4DE] overflow-hidden"
              style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#FDFCFA] border-b border-[#E8E4DE]">
                      {['Date', 'Type', 'Volume', 'Opérateur', 'Raison'].map((col) => (
                        <th
                          key={col}
                          className={`px-4 py-3 text-xs font-semibold text-[#5C5550] uppercase tracking-wide ${
                            col === 'Volume' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDE9E3]">
                    {lot.movements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12">
                          <ArrowLeftRight size={28} className="mx-auto mb-2 text-[#9B9590]" />
                          <p className="text-sm text-[#9B9590]">Aucun mouvement enregistré</p>
                        </td>
                      </tr>
                    ) : (
                      lot.movements.map((m: any) => (
                        <tr key={m.id} className="hover:bg-[#F5F3EF] transition-colors">
                          <td className="px-4 py-3 text-sm text-[#1A1714]">
                            {new Date(m.date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-[#5C5550]">
                              {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-medium text-[#1A1714]">
                              {Number(m.volume_liters).toLocaleString('fr')} L
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#5C5550]">{m.operator_name || '—'}</td>
                          <td className="px-4 py-3 text-sm text-[#5C5550] max-w-xs truncate">{m.reason || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {lot.movements.length === 0 ? (
                <div
                  className="bg-white rounded-xl border border-[#E8E4DE] p-8 text-center"
                  style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
                >
                  <ArrowLeftRight size={28} className="mx-auto mb-2 text-[#9B9590]" />
                  <p className="text-sm text-[#9B9590]">Aucun mouvement enregistré</p>
                </div>
              ) : (
                lot.movements.map((m: any) => (
                  <div
                    key={m.id}
                    className="bg-white rounded-xl border border-[#E8E4DE] p-4"
                    style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#9B9590]">
                        {new Date(m.date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#F5F3EF] text-[#5C5550]">
                        {MOVEMENT_LABELS[m.movement_type] || m.movement_type}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-[#1A1714]">
                      {Number(m.volume_liters).toLocaleString('fr')} L
                    </p>
                    {m.operator_name && (
                      <p className="text-xs text-[#5C5550] mt-1">Par {m.operator_name}</p>
                    )}
                    {m.reason && (
                      <p className="text-xs text-[#9B9590] mt-1 line-clamp-2">{m.reason}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ─── TRACEABILITY ─── */}
        {tab === 'traceability' && (
          <div
            className="bg-white rounded-xl border border-[#E8E4DE] p-4 sm:p-6"
            style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}
          >
            <h2 className="text-sm font-semibold text-[#1A1714] mb-4 flex items-center gap-2">
              <GitBranch size={16} style={{ color: '#8B1A2F' }} />
              Arbre de traçabilité
            </h2>
            {traceability ? (
              <div className="overflow-x-auto">
                <TraceabilityTree node={traceability} level={0} navigate={navigate} />
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
                    style={{ borderColor: '#F3C5CE', borderTopColor: '#8B1A2F' }}
                  />
                  <p className="text-sm text-[#9B9590]">Chargement de la traçabilité…</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TraceabilityTree({
  node, level, navigate,
}: {
  node: any;
  level: number;
  navigate: (path: string) => void;
}) {
  if (!node) return null;

  const typeConf = TYPE_CONFIG[node.type] || TYPE_CONFIG.autre;
  // Cap indent on mobile to prevent overflow: max 2 levels of 16px, then 24px on sm+
  const mobileIndent = Math.min(level * 16, 48);
  const desktopIndent = level * 24;

  return (
    <div style={{ marginLeft: mobileIndent }} className={`sm:ml-[${desktopIndent}px]`}>
      {level > 0 && (
        <div
          className="w-px h-4 ml-3 mb-1"
          style={{ backgroundColor: '#E8E4DE' }}
        />
      )}
      <div
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[#E8E4DE] hover:bg-[#F5F3EF] cursor-pointer mb-2 transition-colors min-h-[44px]"
        onClick={() => navigate(`/lots/${node.id}`)}
      >
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: typeConf.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#1A1714] truncate">{node.lot_number}</span>
            <span className="text-sm text-[#5C5550] truncate min-w-0">{node.name}</span>
            {node.percentage && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                style={{ backgroundColor: typeConf.bg, color: typeConf.color }}
              >
                {node.percentage}%
              </span>
            )}
          </div>
          <p className="text-xs text-[#9B9590] mt-0.5">
            {node.vintage_year && `${node.vintage_year} · `}
            {Number(node.current_volume_liters || 0).toLocaleString('fr')} L
          </p>
        </div>
        {level === 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 hidden xs:inline-flex sm:inline-flex"
            style={{ backgroundColor: '#FDF2F4', color: '#8B1A2F', border: '1px solid #F3C5CE' }}
          >
            Lot principal
          </span>
        )}
      </div>
      {node.origins?.map((origin: any, i: number) => (
        <TraceabilityTree key={i} node={origin} level={level + 1} navigate={navigate} />
      ))}
    </div>
  );
}
