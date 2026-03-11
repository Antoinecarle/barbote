import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { GitMerge, Plus, Sparkles, CheckCircle } from 'lucide-react';

export default function AssemblageAI() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['assemblage-plans'],
    queryFn: () => api<any[]>('/ai/assemblage'),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f5e6ea] flex items-center gap-2">
            <GitMerge size={24} className="text-purple-400" />
            Assemblage IA
          </h1>
          <p className="text-[#c4a0aa] text-sm mt-1">Planification intelligente des assemblages avec scénarios IA</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Sparkles size={16} /> Nouveau plan IA
        </button>
      </div>

      {/* Plans list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan: any) => (
          <div
            key={plan.id}
            className="card cursor-pointer hover:border-bordeaux-700/50 transition-all"
            onClick={() => setSelectedPlan(plan)}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-[#f5e6ea] text-sm">{plan.name}</h3>
              <StatusBadge status={plan.status} />
            </div>
            <div className="space-y-1.5 text-xs text-[#c4a0aa]">
              <p>🎯 Volume cible: <span className="text-[#f5e6ea]">{Number(plan.target_volume_liters).toLocaleString('fr')} L</span></p>
              {plan.target_appellation && <p>🏷️ Appellation: <span className="text-[#f5e6ea]">{plan.target_appellation}</span></p>}
              <p>🧪 Scénarios: <span className="text-[#f5e6ea]">{(plan.scenarios || []).length}</span></p>
            </div>
            <p className="text-xs text-[#c4a0aa] mt-3">
              {new Date(plan.created_at).toLocaleDateString('fr-FR')} · {plan.created_by_name}
            </p>
          </div>
        ))}
        {plans.length === 0 && (
          <div className="col-span-3 text-center py-16">
            <GitMerge size={48} className="mx-auto mb-4 text-[#2a1520]" />
            <h3 className="text-[#f5e6ea] font-medium mb-2">Aucun plan d'assemblage</h3>
            <p className="text-[#c4a0aa] text-sm mb-4">Créez un plan pour obtenir des scénarios d'assemblage générés par IA</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
              <Sparkles size={16} /> Créer un plan IA
            </button>
          </div>
        )}
      </div>

      {/* Plan detail modal */}
      {selectedPlan && (
        <PlanDetailModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
      )}

      {showCreate && (
        <CreatePlanModal onClose={() => setShowCreate(false)} onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['assemblage-plans'] });
          setShowCreate(false);
        }} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    draft: { label: 'Brouillon', class: 'badge-archived' },
    pending_ai: { label: 'IA en cours...', class: 'badge-warning' },
    scenarios_ready: { label: 'Prêt', class: 'badge-active' },
    approved: { label: 'Approuvé', class: 'badge-bottled' },
    executed: { label: 'Exécuté', class: 'badge-active' },
    cancelled: { label: 'Annulé', class: 'badge-archived' },
  };
  const c = config[status] || config.draft;
  return <span className={c.class}>{c.label}</span>;
}

function PlanDetailModal({ plan, onClose }: { plan: any; onClose: () => void }) {
  const scenarios = plan.scenarios || [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[#f5e6ea]">{plan.name}</h2>
            <p className="text-sm text-[#c4a0aa]">Volume cible: {Number(plan.target_volume_liters).toLocaleString('fr')} L</p>
          </div>
          <button onClick={onClose} className="btn-ghost text-xs">✕</button>
        </div>

        {scenarios.length === 0 ? (
          <div className="text-center py-8 text-[#c4a0aa]">
            <p>Aucun scénario disponible pour ce plan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {scenarios.map((s: any, i: number) => (
              <div key={s.id || i} className="bg-[#12090c] border border-[#2a1520] rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-[#f5e6ea] text-sm">{s.name || `Scénario ${i + 1}`}</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400 text-xs font-bold">{s.quality_score}/100</span>
                  </div>
                </div>

                {/* Lots composition */}
                <div>
                  <p className="text-xs text-[#c4a0aa] mb-1.5">Composition</p>
                  {(s.lots || []).map((l: any, j: number) => (
                    <div key={j} className="flex justify-between text-xs mb-1">
                      <span className="text-[#f5e6ea]">{l.lot_number || l.lot_id}</span>
                      <span className="text-[#c4a0aa]">{l.percentage}% · {Number(l.volume_liters).toLocaleString('fr')} L</span>
                    </div>
                  ))}
                </div>

                {/* Predicted analysis */}
                {s.predicted_analysis && (
                  <div>
                    <p className="text-xs text-[#c4a0aa] mb-1.5">Analyse prédite</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries(s.predicted_analysis).map(([k, v]) => {
                        const labels: Record<string, string> = { alcohol_percent: 'Alcool', total_acidity_gl: 'AT', volatile_acidity_gl: 'AV', ph: 'pH', free_so2_mgl: 'SO₂L' };
                        if (!labels[k]) return null;
                        return (
                          <div key={k} className="flex justify-between">
                            <span className="text-[#c4a0aa]">{labels[k]}</span>
                            <span className="text-[#f5e6ea] font-mono">{v as string}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {s.profile && (
                  <div>
                    <p className="text-xs text-[#c4a0aa] mb-1">Profil</p>
                    <p className="text-xs text-[#f5e6ea] italic">{s.profile}</p>
                  </div>
                )}

                {s.advantages?.length > 0 && (
                  <div>
                    <p className="text-xs text-green-400 mb-1">✓ Avantages</p>
                    {s.advantages.map((a: string, j: number) => (
                      <p key={j} className="text-xs text-[#c4a0aa]">• {a}</p>
                    ))}
                  </div>
                )}

                {s.risks?.length > 0 && (
                  <div>
                    <p className="text-xs text-yellow-400 mb-1">⚠ Risques</p>
                    {s.risks.map((r: string, j: number) => (
                      <p key={j} className="text-xs text-[#c4a0aa]">• {r}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePlanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: lots = [] } = useQuery({ queryKey: ['lots-active'], queryFn: () => api<any[]>('/lots?status=active') });
  const [form, setForm] = useState({
    name: `Plan ${new Date().toLocaleDateString('fr-FR')}`,
    target_volume: '',
    target_appellation: '',
    target_vintage_year: new Date().getFullYear(),
    target_alcohol_min: '',
    target_alcohol_max: '',
    candidate_lot_ids: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleLot = (id: string) => {
    setForm(f => ({
      ...f,
      candidate_lot_ids: f.candidate_lot_ids.includes(id)
        ? f.candidate_lot_ids.filter(l => l !== id)
        : [...f.candidate_lot_ids, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.candidate_lot_ids.length < 2) {
      setError('Sélectionnez au moins 2 lots candidats');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api('/ai/assemblage', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          target_volume: Number(form.target_volume),
          target_analysis: {
            appellation: form.target_appellation,
            vintage_year: form.target_vintage_year,
            alcohol_min: Number(form.target_alcohol_min) || undefined,
            alcohol_max: Number(form.target_alcohol_max) || undefined,
          },
          candidate_lot_ids: form.candidate_lot_ids
        })
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur IA');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#f5e6ea] flex items-center gap-2">
            <Sparkles size={18} className="text-purple-400" />
            Nouveau plan d'assemblage IA
          </h2>
          <button onClick={onClose} className="btn-ghost text-xs">✕</button>
        </div>
        {error && <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nom du plan</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Volume cible (L) *</label><input type="number" className="input" value={form.target_volume} onChange={e => setForm({...form, target_volume: e.target.value})} required /></div>
            <div><label className="label">Appellation cible</label><input className="input" value={form.target_appellation} onChange={e => setForm({...form, target_appellation: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Alcool min (%)</label><input type="number" step="0.1" className="input" value={form.target_alcohol_min} onChange={e => setForm({...form, target_alcohol_min: e.target.value})} /></div>
            <div><label className="label">Alcool max (%)</label><input type="number" step="0.1" className="input" value={form.target_alcohol_max} onChange={e => setForm({...form, target_alcohol_max: e.target.value})} /></div>
          </div>

          <div>
            <label className="label">Lots candidats (min. 2) *</label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {(lots as any[]).map((l: any) => (
                <label key={l.id} className="flex items-center gap-2 cursor-pointer hover:bg-[#12090c] rounded p-2">
                  <input
                    type="checkbox"
                    checked={form.candidate_lot_ids.includes(l.id)}
                    onChange={() => toggleLot(l.id)}
                    className="rounded"
                  />
                  <span className="text-sm text-[#f5e6ea]">{l.lot_number} — {l.name}</span>
                  <span className="text-xs text-[#c4a0aa] ml-auto">{Number(l.current_volume_liters).toLocaleString('fr')} L</span>
                </label>
              ))}
              {(lots as any[]).length === 0 && <p className="text-sm text-[#c4a0aa] text-center py-3">Aucun lot actif</p>}
            </div>
            <p className="text-xs text-[#c4a0aa] mt-1">{form.candidate_lot_ids.length} lot(s) sélectionné(s)</p>
          </div>

          <div className="bg-[#12090c] border border-[#2a1520] rounded-lg p-3">
            <p className="text-xs text-purple-300 flex items-center gap-1.5 mb-1">
              <Sparkles size={12} />
              L'IA va générer 3 scénarios d'assemblage optimaux
            </p>
            <p className="text-xs text-[#c4a0aa]">Analyse des caractéristiques de chaque lot, calcul des assemblages optimaux selon vos objectifs</p>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><span className="animate-spin">⏳</span> Génération IA...</> : <><Sparkles size={14} /> Générer les scénarios</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
