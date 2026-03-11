import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ArrowLeft, Wine, FlaskConical, ArrowLeftRight, GitBranch, Package } from 'lucide-react';

interface LotDetail {
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
  analysis_matrix: Record<string, number>;
  parent_lots: Array<{lot_id: string; percentage: number; volume: number}>;
  parent_lot_details: Array<{id: string; lot_number: string; name: string; type: string; vintage_year: number}>;
  movements: Array<any>;
  analyses: Array<any>;
  containers: Array<any>;
}

const ANALYSIS_LABELS: Record<string, { label: string; unit: string; min?: number; max?: number }> = {
  alcohol_percent: { label: 'Alcool', unit: '%', min: 9, max: 15 },
  total_acidity_gl: { label: 'Acidité totale', unit: 'g/L', min: 3.5, max: 9 },
  volatile_acidity_gl: { label: 'Acidité volatile', unit: 'g/L', min: 0, max: 0.6 },
  ph: { label: 'pH', unit: '', min: 3.0, max: 4.0 },
  free_so2_mgl: { label: 'SO₂ libre', unit: 'mg/L', min: 15, max: 40 },
  total_so2_mgl: { label: 'SO₂ total', unit: 'mg/L', min: 0, max: 200 },
  residual_sugar_gl: { label: 'Sucres résiduels', unit: 'g/L', min: 0, max: 50 },
};

const MOVEMENT_LABELS: Record<string, string> = {
  entree: 'Entrée', sortie: 'Sortie', transfert: 'Transfert',
  assemblage: 'Assemblage', soutirage: 'Soutirage', filtration: 'Filtration',
  collage: 'Collage', perte: 'Perte', bottling: 'Mise en bouteille',
  sulfitage: 'Sulfitage', levurage: 'Levurage', malo: 'Fermentation malolactique'
};

export default function LotDetail() {
  const { id } = useParams<{id: string}>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'overview' | 'analyses' | 'movements' | 'traceability'>('overview');

  const { data: lot, isLoading } = useQuery({
    queryKey: ['lot', id],
    queryFn: () => api<LotDetail>(`/lots/${id}`),
    enabled: !!id
  });

  const { data: traceability } = useQuery({
    queryKey: ['lot-traceability', id],
    queryFn: () => api<any>(`/lots/${id}/traceability`),
    enabled: !!id && tab === 'traceability'
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (!lot) return <div className="text-[#c4a0aa]">Lot non trouvé</div>;

  const volumePercent = Math.min(100, (lot.current_volume_liters / lot.initial_volume_liters) * 100);
  const latestAnalysis = lot.analyses[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/lots')} className="btn-ghost">
          <ArrowLeft size={16} /> Retour
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#f5e6ea] flex items-center gap-2">
            <Wine size={24} className="text-bordeaux-400" />
            {lot.lot_number} — {lot.name}
          </h1>
          <p className="text-[#c4a0aa] text-sm">{lot.appellation} · {lot.vintage_year} · {lot.type}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2a1520]">
        {[
          { key: 'overview', label: 'Vue d\'ensemble', icon: Wine },
          { key: 'analyses', label: 'Analyses', icon: FlaskConical },
          { key: 'movements', label: 'Mouvements', icon: ArrowLeftRight },
          { key: 'traceability', label: 'Traçabilité', icon: GitBranch },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-bordeaux-500 text-bordeaux-300'
                : 'border-transparent text-[#c4a0aa] hover:text-[#f5e6ea]'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="card xl:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-[#f5e6ea]">Informations</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#c4a0aa]">Volume actuel</p>
                <p className="text-xl font-bold text-[#f5e6ea]">{Number(lot.current_volume_liters).toLocaleString('fr')} L</p>
                <div className="w-full bg-[#2a1520] rounded-full h-1.5 mt-1">
                  <div className="h-1.5 rounded-full bg-bordeaux-500" style={{ width: `${volumePercent}%` }} />
                </div>
                <p className="text-xs text-[#c4a0aa] mt-1">{Math.round(volumePercent)}% du volume initial ({Number(lot.initial_volume_liters).toLocaleString('fr')} L)</p>
              </div>
              <div>
                <p className="text-xs text-[#c4a0aa]">Cépages</p>
                {lot.grape_varieties?.length > 0 ? (
                  <div className="space-y-1 mt-1">
                    {lot.grape_varieties.map((g, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-[#f5e6ea]">{g.variety}</span>
                        <span className="text-[#c4a0aa]">{g.percentage}%</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-[#c4a0aa]">Non défini</p>}
              </div>
            </div>

            {/* Current containers */}
            <div>
              <h3 className="text-xs text-[#c4a0aa] mb-2 flex items-center gap-1"><Package size={12} /> Contenants actuels</h3>
              {lot.containers.filter(c => c.is_current).length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {lot.containers.filter(c => c.is_current).map((c: any) => (
                    <div key={c.container_id || c.id} className="bg-[#12090c] border border-[#2a1520] rounded-lg p-3">
                      <p className="text-sm font-medium text-[#f5e6ea]">{c.code}</p>
                      <p className="text-xs text-[#c4a0aa]">{c.name}</p>
                      <p className="text-xs text-bordeaux-400 mt-1">{Number(c.volume_liters || 0).toLocaleString('fr')} L</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-[#c4a0aa]">Aucun contenant assigné</p>}
            </div>

            {/* Notes */}
            {lot.notes && (
              <div>
                <p className="text-xs text-[#c4a0aa] mb-1">Notes</p>
                <p className="text-sm text-[#f5e6ea] bg-[#12090c] rounded-lg p-3">{lot.notes}</p>
              </div>
            )}
          </div>

          {/* Analysis summary */}
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-[#f5e6ea]">Dernière analyse</h2>
            {latestAnalysis ? (
              <>
                <p className="text-xs text-[#c4a0aa]">
                  {new Date(latestAnalysis.analysis_date).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                  {latestAnalysis.lab_name && ` · ${latestAnalysis.lab_name}`}
                </p>
                <div className="space-y-2.5">
                  {Object.entries(ANALYSIS_LABELS).map(([key, config]) => {
                    const val = latestAnalysis[key];
                    if (!val) return null;
                    return (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-xs text-[#c4a0aa]">{config.label}</span>
                        <span className="text-sm font-medium text-[#f5e6ea]">
                          {val} {config.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-[#c4a0aa] text-center py-4">Aucune analyse disponible</p>
            )}

            {/* Parent lots */}
            {lot.parent_lot_details?.length > 0 && (
              <div className="border-t border-[#2a1520] pt-3">
                <p className="text-xs text-[#c4a0aa] mb-2">Issu de</p>
                {lot.parent_lot_details.map(p => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/lots/${p.id}`)}
                    className="block w-full text-left bg-[#12090c] border border-[#2a1520] hover:border-bordeaux-700 rounded-lg p-2.5 mb-1.5 transition-colors"
                  >
                    <p className="text-xs font-medium text-[#f5e6ea]">{p.lot_number}</p>
                    <p className="text-xs text-[#c4a0aa]">{p.name} · {p.vintage_year}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analyses */}
      {tab === 'analyses' && (
        <div className="space-y-4">
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a1520]">
                  <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Date</th>
                  <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Type</th>
                  <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">Alcool</th>
                  <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">AT</th>
                  <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">AV</th>
                  <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">pH</th>
                  <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">SO₂L</th>
                  <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">SO₂T</th>
                </tr>
              </thead>
              <tbody>
                {lot.analyses.map((a: any) => (
                  <tr key={a.id} className="table-row">
                    <td className="px-4 py-3 text-sm text-[#f5e6ea]">
                      {new Date(a.analysis_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#c4a0aa] capitalize">{a.analysis_type}</td>
                    <td className="px-4 py-3 text-right text-sm text-[#f5e6ea]">{a.alcohol_percent ? `${a.alcohol_percent}%` : '—'}</td>
                    <td className="px-4 py-3 text-right text-sm text-[#f5e6ea]">{a.total_acidity_gl ? `${a.total_acidity_gl}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-sm text-[#f5e6ea]">{a.volatile_acidity_gl ? `${a.volatile_acidity_gl}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-sm text-[#f5e6ea]">{a.ph || '—'}</td>
                    <td className="px-4 py-3 text-right text-sm text-[#f5e6ea]">{a.free_so2_mgl || '—'}</td>
                    <td className="px-4 py-3 text-right text-sm text-[#f5e6ea]">{a.total_so2_mgl || '—'}</td>
                  </tr>
                ))}
                {lot.analyses.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-[#c4a0aa] text-sm">Aucune analyse</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movements */}
      {tab === 'movements' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a1520]">
                <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Date</th>
                <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Type</th>
                <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">Volume</th>
                <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Opérateur</th>
                <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Raison</th>
              </tr>
            </thead>
            <tbody>
              {lot.movements.map((m: any) => (
                <tr key={m.id} className="table-row">
                  <td className="px-4 py-3 text-sm text-[#f5e6ea]">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-3 text-sm text-[#f5e6ea]">{MOVEMENT_LABELS[m.movement_type] || m.movement_type}</td>
                  <td className="px-4 py-3 text-right text-sm text-[#f5e6ea]">{Number(m.volume_liters).toLocaleString('fr')} L</td>
                  <td className="px-4 py-3 text-sm text-[#c4a0aa]">{m.operator_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-[#c4a0aa] max-w-xs truncate">{m.reason || '—'}</td>
                </tr>
              ))}
              {lot.movements.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-[#c4a0aa] text-sm">Aucun mouvement</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Traceability */}
      {tab === 'traceability' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-sm font-semibold text-[#f5e6ea] mb-4 flex items-center gap-2">
              <GitBranch size={16} className="text-bordeaux-400" />
              Arbre de traçabilité
            </h2>
            {traceability ? (
              <TraceabilityTree node={traceability} level={0} navigate={navigate} />
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin text-bordeaux-400">⏳</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TraceabilityTree({ node, level, navigate }: { node: any; level: number; navigate: any }) {
  if (!node) return null;

  const TYPE_COLORS: Record<string, string> = {
    rouge: '#be185d', blanc: '#d4a017', rose: '#f9a8d4', autre: '#6b7280'
  };

  return (
    <div style={{ marginLeft: level * 20 }}>
      <div
        className="flex items-center gap-3 p-3 rounded-lg border border-[#2a1520] hover:border-bordeaux-700 cursor-pointer mb-2 transition-colors"
        onClick={() => navigate(`/lots/${node.id}`)}
      >
        <div className="w-3 h-3 rounded-full" style={{ background: TYPE_COLORS[node.type] || '#6b7280' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#f5e6ea]">{node.lot_number}</span>
            <span className="text-xs text-[#c4a0aa]">{node.name}</span>
          </div>
          <p className="text-xs text-[#c4a0aa]">
            {node.vintage_year} · {Number(node.current_volume_liters || 0).toLocaleString('fr')} L
            {node.percentage && ` · ${node.percentage}%`}
          </p>
        </div>
        {level === 0 && (
          <span className="text-xs bg-bordeaux-900/50 text-bordeaux-300 px-2 py-0.5 rounded-full">Lot principal</span>
        )}
      </div>
      {node.origins?.map((origin: any, i: number) => (
        <TraceabilityTree key={i} node={origin} level={level + 1} navigate={navigate} />
      ))}
    </div>
  );
}
