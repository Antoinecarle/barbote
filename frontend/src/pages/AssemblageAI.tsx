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
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight flex items-center gap-2"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif", color: '#1A1714' }}
          >
            <GitMerge size={22} className="text-[#8B1A2F]" />
            Assemblage IA
          </h1>
          <p className="text-sm text-[#5C5550] mt-1">
            Planification intelligente des assemblages avec scénarios IA
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: '#8B1A2F' }}
        >
          <Sparkles size={16} />
          Nouveau plan IA
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan: any) => (
          <div
            key={plan.id}
            className="bg-white rounded-xl border border-[#E8E4DE] p-5 cursor-pointer hover:border-[#8B1A2F]/30 transition-all duration-200"
            style={{
              boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 4px 12px rgba(26,23,20,0.12), 0 8px 24px rgba(26,23,20,0.08)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)';
            }}
            onClick={() => setSelectedPlan(plan)}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-[#1A1714] text-sm">{plan.name}</h3>
              <StatusBadge status={plan.status} />
            </div>
            <div className="space-y-1.5 text-xs text-[#5C5550]">
              <p>
                🎯 Volume cible:{' '}
                <span className="text-[#1A1714] font-medium">
                  {Number(plan.target_volume_liters).toLocaleString('fr')} L
                </span>
              </p>
              {plan.target_appellation && (
                <p>
                  🏷️ Appellation:{' '}
                  <span className="text-[#1A1714]">{plan.target_appellation}</span>
                </p>
              )}
              <p>
                🧪 Scénarios:{' '}
                <span className="text-[#1A1714]">{(plan.scenarios || []).length}</span>
              </p>
            </div>
            <p className="text-xs text-[#9B9590] mt-3">
              {new Date(plan.created_at).toLocaleDateString('fr-FR')} · {plan.created_by_name}
            </p>
          </div>
        ))}

        {plans.length === 0 && (
          <div className="col-span-3 text-center py-16 bg-white rounded-xl border border-[#E8E4DE]">
            <GitMerge size={48} className="mx-auto mb-4 text-[#E8E4DE]" />
            <h3 className="text-[#1A1714] font-medium mb-2">Aucun plan d'assemblage</h3>
            <p className="text-[#5C5550] text-sm mb-4">
              Créez un plan pour obtenir des scénarios d'assemblage générés par IA
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all duration-200 hover:opacity-90 mx-auto"
              style={{ backgroundColor: '#8B1A2F' }}
            >
              <Sparkles size={16} />
              Créer un plan IA
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedPlan && (
        <PlanDetailModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
      )}
      {showCreate && (
        <CreatePlanModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['assemblage-plans'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    draft:           { label: 'Brouillon',   bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
    pending_ai:      { label: 'IA en cours', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    scenarios_ready: { label: 'Prêt',        bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
    approved:        { label: 'Approuvé',    bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    executed:        { label: 'Exécuté',     bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
    cancelled:       { label: 'Annulé',      bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  };
  const c = config[status] || config.draft;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      {c.label}
    </span>
  );
}

function PlanDetailModal({ plan, onClose }: { plan: any; onClose: () => void }) {
  const scenarios = plan.scenarios || [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
        style={{ boxShadow: '0 10px 40px rgba(26,23,20,0.12), 0 4px 16px rgba(26,23,20,0.08)' }}
      >
        {/* Modal header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg font-semibold text-[#1A1714]">{plan.name}</h2>
            <p className="text-sm text-[#5C5550] mt-0.5">
              Volume cible: {Number(plan.target_volume_liters).toLocaleString('fr')} L
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#9B9590] hover:text-[#5C5550] transition-colors p-1 rounded-md hover:bg-[#F5F3EF]"
          >
            ✕
          </button>
        </div>

        {scenarios.length === 0 ? (
          <div className="text-center py-8 text-[#9B9590]">
            Aucun scénario disponible pour ce plan
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {scenarios.map((s: any, i: number) => (
              <div
                key={s.id || i}
                className="bg-[#FDFCFA] border border-[#E8E4DE] rounded-xl p-4 space-y-3"
              >
                {/* Scenario header */}
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-[#1A1714] text-sm">
                    {s.name || `Scénario ${i + 1}`}
                  </h3>
                  <span className="text-amber-700 text-xs font-bold bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    {s.quality_score}/100
                  </span>
                </div>

                {/* Lots composition */}
                <div>
                  <p className="text-xs text-[#5C5550] mb-1.5 font-medium">Composition</p>
                  {(s.lots || []).map((l: any, j: number) => (
                    <div key={j} className="flex justify-between text-xs mb-1">
                      <span className="text-[#1A1714]">{l.lot_number || l.lot_id}</span>
                      <span className="text-[#5C5550]">
                        {l.percentage}% · {Number(l.volume_liters).toLocaleString('fr')} L
                      </span>
                    </div>
                  ))}
                </div>

                {/* Predicted analysis */}
                {s.predicted_analysis && (
                  <div>
                    <p className="text-xs text-[#5C5550] mb-1.5 font-medium">Analyse prédite</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries(s.predicted_analysis).map(([k, v]) => {
                        const labels: Record<string, string> = {
                          alcohol_percent: 'Alcool',
                          total_acidity_gl: 'AT',
                          volatile_acidity_gl: 'AV',
                          ph: 'pH',
                          free_so2_mgl: 'SO₂L',
                        };
                        if (!labels[k]) return null;
                        return (
                          <div key={k} className="flex justify-between">
                            <span className="text-[#5C5550]">{labels[k]}</span>
                            <span className="text-[#1A1714] font-mono">{v as string}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Profile */}
                {s.profile && (
                  <div>
                    <p className="text-xs text-[#5C5550] mb-1 font-medium">Profil</p>
                    <p className="text-xs text-[#1A1714] italic">{s.profile}</p>
                  </div>
                )}

                {/* Advantages */}
                {s.advantages?.length > 0 && (
                  <div>
                    <p className="text-xs text-green-700 mb-1 font-medium">✓ Avantages</p>
                    {s.advantages.map((a: string, j: number) => (
                      <p key={j} className="text-xs text-[#5C5550]">• {a}</p>
                    ))}
                  </div>
                )}

                {/* Risks */}
                {s.risks?.length > 0 && (
                  <div>
                    <p className="text-xs text-amber-700 mb-1 font-medium">⚠ Risques</p>
                    {s.risks.map((r: string, j: number) => (
                      <p key={j} className="text-xs text-[#5C5550]">• {r}</p>
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
  const { data: lots = [] } = useQuery({
    queryKey: ['lots-active'],
    queryFn: () => api<any[]>('/lots?status=active'),
  });
  const [form, setForm] = useState({
    name: `Plan ${new Date().toLocaleDateString('fr-FR')}`,
    target_volume: '',
    target_appellation: '',
    target_vintage_year: new Date().getFullYear(),
    target_alcohol_min: '',
    target_alcohol_max: '',
    candidate_lot_ids: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleLot = (id: string) => {
    setForm(f => ({
      ...f,
      candidate_lot_ids: f.candidate_lot_ids.includes(id)
        ? f.candidate_lot_ids.filter(l => l !== id)
        : [...f.candidate_lot_ids, id],
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
          candidate_lot_ids: form.candidate_lot_ids,
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur IA');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#1A1714] placeholder-[#9B9590] shadow-sm focus:outline-none focus:ring-2 focus:border-[#8B1A2F] transition-colors';
  const inputFocusStyle = { '--tw-ring-color': 'rgba(139,26,47,0.2)' } as React.CSSProperties;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6"
        style={{ boxShadow: '0 10px 40px rgba(26,23,20,0.12), 0 4px 16px rgba(26,23,20,0.08)' }}
      >
        {/* Modal header */}
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-lg font-semibold text-[#1A1714] flex items-center gap-2">
            <Sparkles size={18} className="text-[#8B1A2F]" />
            Nouveau plan d'assemblage IA
          </h2>
          <button
            onClick={onClose}
            className="text-[#9B9590] hover:text-[#5C5550] transition-colors p-1 rounded-md hover:bg-[#F5F3EF]"
          >
            ✕
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan name */}
          <div>
            <label className="block text-sm font-medium text-[#1A1714] mb-1">Nom du plan</label>
            <input
              className={inputClass}
              style={inputFocusStyle}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* Volume + Appellation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1A1714] mb-1">
                Volume cible (L) *
              </label>
              <input
                type="number"
                className={inputClass}
                style={inputFocusStyle}
                value={form.target_volume}
                onChange={e => setForm({ ...form, target_volume: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1714] mb-1">
                Appellation cible
              </label>
              <input
                className={inputClass}
                style={inputFocusStyle}
                value={form.target_appellation}
                onChange={e => setForm({ ...form, target_appellation: e.target.value })}
              />
            </div>
          </div>

          {/* Alcohol range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1A1714] mb-1">Alcool min (%)</label>
              <input
                type="number"
                step="0.1"
                className={inputClass}
                style={inputFocusStyle}
                value={form.target_alcohol_min}
                onChange={e => setForm({ ...form, target_alcohol_min: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1714] mb-1">Alcool max (%)</label>
              <input
                type="number"
                step="0.1"
                className={inputClass}
                style={inputFocusStyle}
                value={form.target_alcohol_max}
                onChange={e => setForm({ ...form, target_alcohol_max: e.target.value })}
              />
            </div>
          </div>

          {/* Candidate lots */}
          <div>
            <label className="block text-sm font-medium text-[#1A1714] mb-1">
              Lots candidats (min. 2) *
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto border border-[#E8E4DE] rounded-lg p-2 bg-white">
              {(lots as any[]).map((l: any) => (
                <label
                  key={l.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-[#F5F3EF] rounded-md p-1.5 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={form.candidate_lot_ids.includes(l.id)}
                    onChange={() => toggleLot(l.id)}
                    className="rounded accent-[#8B1A2F]"
                  />
                  <span className="text-sm text-[#1A1714]">
                    {l.lot_number} — {l.name}
                  </span>
                  <span className="text-xs text-[#9B9590] ml-auto">
                    {Number(l.current_volume_liters).toLocaleString('fr')} L
                  </span>
                </label>
              ))}
              {(lots as any[]).length === 0 && (
                <p className="text-sm text-[#9B9590] text-center py-3">Aucun lot actif</p>
              )}
            </div>
            <p className="text-xs text-[#5C5550] mt-1">
              {form.candidate_lot_ids.length} lot(s) sélectionné(s)
            </p>
          </div>

          {/* AI info banner */}
          <div className="bg-[#FDF2F4] border border-[#F3C5CE] rounded-lg p-3">
            <p className="text-xs text-[#8B1A2F] flex items-center gap-1.5 mb-1 font-medium">
              <Sparkles size={12} />
              L'IA va générer 3 scénarios d'assemblage optimaux
            </p>
            <p className="text-xs text-[#5C5550]">
              Analyse des caractéristiques de chaque lot, calcul des assemblages optimaux selon vos
              objectifs
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#5C5550] bg-white border border-[#E8E4DE] rounded-lg shadow-sm hover:bg-[#F5F3EF] transition-all duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-all duration-200 hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#8B1A2F' }}
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block">⏳</span>
                  Génération IA...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Générer les scénarios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
