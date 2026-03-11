/**
 * AssemblageAI.tsx — Deep Feature Dive Enhanced
 * Animated AI generation steps, proportion bars, analysis gauges, fallback indicator
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  GitMerge, Sparkles, CheckCircle, TrendingUp,
  ChevronRight, X, Info, AlertTriangle, Play, Award
} from 'lucide-react';

// Types
interface Lot { id: string; lot_number: string; name: string; type: string; vintage_year: number; current_volume_liters: number; appellation?: string; }
interface Scenario { id: string; name: string; lots: Array<{ lot_id: string; lot_number: string; percentage: number; volume_liters: number }>; predicted_analysis: Record<string, number>; quality_score: number; profile: string; reasoning: string; risks: string[]; advantages: string[]; is_fallback?: boolean; }
interface Plan { id: string; name: string; target_volume_liters: number; target_appellation?: string; status: string; scenarios: Scenario[]; created_at: string; created_by_name?: string; used_fallback?: boolean; }

const ANALYSIS_PARAMS = [
  { key: 'alcohol_percent', label: 'Alcool', unit: '%', min: 9, max: 16, optMin: 12, optMax: 14.5 },
  { key: 'total_acidity_gl', label: 'Acid. totale', unit: 'g/L', min: 2, max: 9, optMin: 4, optMax: 7 },
  { key: 'volatile_acidity_gl', label: 'Acid. vol.', unit: 'g/L', min: 0, max: 1, optMin: 0, optMax: 0.6, alert: (v: number) => v > 0.6 },
  { key: 'ph', label: 'pH', unit: '', min: 2.8, max: 4.2, optMin: 3.2, optMax: 3.8 },
  { key: 'free_so2_mgl', label: 'SO\u2082 libre', unit: 'mg/L', min: 0, max: 60, optMin: 20, optMax: 35, alert: (v: number) => v < 15 },
];

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; text: string; border: string }> = {
    draft: { label: 'Brouillon', bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
    pending_ai: { label: 'IA en cours', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    scenarios_ready: { label: 'Prêt', bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
    approved: { label: 'Approuvé', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    executed: { label: 'Exécuté', bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
    cancelled: { label: 'Annulé', bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
  };
  const c = cfg[status] || cfg.draft;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border" style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}>{c.label}</span>;
}

function AnalysisGauge({ param, value }: { param: typeof ANALYSIS_PARAMS[0]; value: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);
  const pct = Math.min(100, Math.max(0, ((value - param.min) / (param.max - param.min)) * 100));
  const isAlert = (param as any).alert?.(value);
  const isOk = !isAlert && param.optMin != null && value >= param.optMin && value <= (param.optMax ?? Infinity);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-[#5C5550]">{param.label}</span>
        <span className={`text-xs font-mono font-semibold ${isAlert ? 'text-red-600' : isOk ? 'text-green-700' : 'text-[#1A1714]'}`}>
          {value?.toFixed(1)}{param.unit}{isAlert ? ' \u26a0' : isOk ? ' \u2713' : ''}
        </span>
      </div>
      <div className="h-1.5 bg-[#E8E4DE] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: mounted ? `${pct}%` : '0%', backgroundColor: isAlert ? '#DC2626' : isOk ? '#16A34A' : '#8B1A2F' }} />
      </div>
    </div>
  );
}

function ProportionBar({ percentage, lotNumber, volume }: { percentage: number; lotNumber: string; volume: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 150); return () => clearTimeout(t); }, []);
  const hue = (parseInt(lotNumber.replace(/\D/g, '') || '0') * 47) % 360;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#1A1714] font-medium">{lotNumber}</span>
        <span className="text-[#5C5550]">{percentage}% \u00b7 {Number(volume).toLocaleString('fr')} L</span>
      </div>
      <div className="h-2 bg-[#E8E4DE] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: mounted ? `${percentage}%` : '0%', backgroundColor: `hsl(${hue},55%,48%)` }} />
      </div>
    </div>
  );
}

const AI_STEPS = [
  { id: 1, label: 'Analyse des lots candidats\u2026', icon: '\ud83c\udf77', duration: 2500 },
  { id: 2, label: 'Extraction des profils analytiques\u2026', icon: '\ud83d\udd2c', duration: 3000 },
  { id: 3, label: 'Calcul des combinaisons optimales\u2026', icon: '\u2696\ufe0f', duration: 4000 },
  { id: 4, label: 'G\u00e9n\u00e9ration des 3 sc\u00e9narios IA\u2026', icon: '\ud83e\udde0', duration: 5000 },
  { id: 5, label: 'Calcul des matrices d\'analyses\u2026', icon: '\ud83d\udcca', duration: 3000 },
  { id: 6, label: 'V\u00e9rification conformit\u00e9 r\u00e9glementaire\u2026', icon: '\u2705', duration: 2000 },
];

function AIGenerationSteps() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  useEffect(() => {
    let delay = 0;
    AI_STEPS.forEach((step, i) => {
      const d = delay;
      delay += step.duration;
      setTimeout(() => { setCurrentStep(i + 1); setCompletedSteps(p => [...p, step.id]); }, d + step.duration * 0.3);
    });
  }, []);
  return (
    <div className="py-4 px-2">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-full bg-[#FDF2F4] border border-[#F3C5CE] flex items-center justify-center">
          <Sparkles size={16} className="text-[#8B1A2F] animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1A1714]">IA en cours de calcul\u2026</p>
          <p className="text-xs text-[#9B9590]">Patientez, les sc\u00e9narios sont g\u00e9n\u00e9r\u00e9s pour vous</p>
        </div>
      </div>
      <div className="space-y-3">
        {AI_STEPS.map((step, i) => {
          const done = completedSteps.includes(step.id);
          const active = currentStep === i + 1 && !done;
          return (
            <div key={step.id} className={`flex items-center gap-3 transition-all duration-300 ${i >= currentStep ? 'opacity-30' : 'opacity-100'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${done ? 'bg-green-100 border border-green-200' : active ? 'bg-[#FDF2F4] border border-[#F3C5CE]' : 'bg-[#F5F3EF] border border-[#E8E4DE]'}`}>
                {done ? '\u2713' : step.icon}
              </div>
              <span className={`text-sm ${done ? 'text-green-700 line-through decoration-green-400' : active ? 'text-[#8B1A2F] font-medium' : 'text-[#9B9590]'}`}>{step.label}</span>
              {active && <span className="ml-auto flex gap-0.5">{[0,150,300].map(d => <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#8B1A2F] animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-5 h-1.5 bg-[#E8E4DE] rounded-full overflow-hidden">
        <div className="h-full bg-[#8B1A2F] rounded-full transition-all duration-700 ease-out" style={{ width: `${(completedSteps.length / AI_STEPS.length) * 100}%` }} />
      </div>
      <p className="text-xs text-[#9B9590] mt-2 text-right">{completedSteps.length}/{AI_STEPS.length} \u00e9tapes</p>
    </div>
  );
}

function PlanDetailModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const scenarios = plan.scenarios || [];
  const [selected, setSelected] = useState<string | null>(null);
  const sorted = [...scenarios].sort((a, b) => b.quality_score - a.quality_score);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-5xl my-4" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div className="flex items-start justify-between p-6 border-b border-[#E8E4DE]">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-semibold text-[#1A1714]">{plan.name}</h2>
              <StatusBadge status={plan.status} />
              {plan.used_fallback && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200"><Info size={10} /> Calcul manuel</span>}
            </div>
            <p className="text-sm text-[#5C5550]">Volume cible : {Number(plan.target_volume_liters).toLocaleString('fr')} L{plan.target_appellation && ` \u00b7 ${plan.target_appellation}`}</p>
          </div>
          <button onClick={onClose} className="text-[#9B9590] hover:text-[#1A1714] p-1.5 rounded-lg hover:bg-[#F5F3EF]"><X size={18} /></button>
        </div>
        {scenarios.length === 0 ? (
          <div className="text-center py-16 text-[#9B9590]"><p className="text-4xl mb-3">\ud83c\udf77</p>Aucun sc\u00e9nario disponible</div>
        ) : (
          <div className="p-6">
            <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-[#FDF2F4] border border-[#F3C5CE] rounded-lg">
              <Award size={14} className="text-[#8B1A2F]" />
              <span className="text-xs text-[#8B1A2F] font-medium">Meilleur sc\u00e9nario : <strong>{sorted[0]?.name}</strong> (score {sorted[0]?.quality_score}/100)</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {sorted.map((s, i) => (
                <div key={s.id} onClick={() => setSelected(selected === s.id ? null : s.id)}
                  className={`rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ${selected === s.id ? 'border-[#8B1A2F] bg-[#FDF2F4]' : i === 0 ? 'border-amber-300 bg-amber-50/50' : 'border-[#E8E4DE] hover:border-[#8B1A2F]/40'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      {i === 0 && <span className="text-xs text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-full mb-1.5 inline-block">\u2605 Recommand\u00e9</span>}
                      <h3 className="font-semibold text-[#1A1714] text-sm">{s.name}</h3>
                    </div>
                    <div className="text-right"><div className="text-2xl font-bold text-[#8B1A2F] font-mono">{s.quality_score}</div><div className="text-xs text-[#9B9590]">/100</div></div>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide mb-2">Composition</p>
                    {s.lots.map((l, j) => <ProportionBar key={j} lotNumber={l.lot_number} percentage={l.percentage} volume={l.volume_liters} />)}
                  </div>
                  {s.predicted_analysis && Object.keys(s.predicted_analysis).length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Analyse pr\u00e9dite</p>
                      {ANALYSIS_PARAMS.filter(p => s.predicted_analysis[p.key] != null).map(param => <AnalysisGauge key={param.key} param={param} value={s.predicted_analysis[param.key]} />)}
                    </div>
                  )}
                  {s.profile && <p className="text-xs text-[#5C5550] italic mb-3">{s.profile}</p>}
                  {s.advantages?.slice(0,2).map((a, j) => <p key={j} className="text-xs text-green-700">\u2713 {a}</p>)}
                  {s.risks?.[0] && <p className="text-xs text-amber-700 flex items-start gap-1 mt-1"><AlertTriangle size={11} className="mt-0.5 flex-shrink-0" /> {s.risks[0]}</p>}
                  {selected === s.id && <div className="mt-3 pt-3 border-t border-[#F3C5CE]"><p className="text-xs text-[#8B1A2F] font-medium flex items-center gap-1"><CheckCircle size={12} /> Sc\u00e9nario s\u00e9lectionn\u00e9</p></div>}
                </div>
              ))}
            </div>
            {selected && (() => { const s = scenarios.find(sc => sc.id === selected); return s?.reasoning ? (<div className="mt-5 p-4 bg-[#F5F3EF] rounded-lg border border-[#E8E4DE]"><p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide mb-2">Raisonnement IA \u2014 {s.name}</p><p className="text-sm text-[#1A1714] leading-relaxed">{s.reasoning}</p></div>) : null; })()}
            <div className="flex gap-3 mt-6 pt-5 border-t border-[#E8E4DE]">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5550] border border-[#E8E4DE] rounded-lg hover:bg-[#F5F3EF]">Fermer</button>
              {selected && <button className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg" style={{ backgroundColor: '#8B1A2F' }}><Play size={14} /> Ex\u00e9cuter ce sc\u00e9nario</button>}
              <div className="ml-auto text-xs text-[#9B9590] self-center">{scenarios.length} sc\u00e9nario{scenarios.length > 1 ? 's' : ''} g\u00e9n\u00e9r\u00e9s</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreatePlanModal({ onClose, onCreated }: { onClose: () => void; onCreated: (plan: any) => void }) {
  const { data: lots = [] } = useQuery<Lot[]>({ queryKey: ['lots-active'], queryFn: () => api<Lot[]>('/lots?status=active') });
  const [form, setForm] = useState({ name: `Plan ${new Date().toLocaleDateString('fr-FR')}`, target_volume: '', target_appellation: '', target_vintage_year: new Date().getFullYear(), target_alcohol_min: '', target_alcohol_max: '', candidate_lot_ids: [] as string[] });
  const [step, setStep] = useState<'form'|'generating'|'done'|'error'>('form');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const toggleLot = (id: string) => setForm(f => ({ ...f, candidate_lot_ids: f.candidate_lot_ids.includes(id) ? f.candidate_lot_ids.filter(l => l !== id) : [...f.candidate_lot_ids, id] }));
  const selectedLots = (lots as Lot[]).filter(l => form.candidate_lot_ids.includes(l.id));
  const totalVol = selectedLots.reduce((s, l) => s + Number(l.current_volume_liters), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.candidate_lot_ids.length < 2) { setError('S\u00e9lectionnez au moins 2 lots candidats'); return; }
    setError(''); setStep('generating');
    try {
      const data = await api<any>('/ai/assemblage', { method: 'POST', body: JSON.stringify({ name: form.name, target_volume: Number(form.target_volume), target_analysis: { appellation: form.target_appellation || undefined, vintage_year: form.target_vintage_year, alcohol_min: Number(form.target_alcohol_min) || undefined, alcohol_max: Number(form.target_alcohol_max) || undefined }, candidate_lot_ids: form.candidate_lot_ids }) });
      setResult(data); setStep('done');
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); setStep('error'); }
  };

  const cls = 'w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#1A1714] placeholder-[#9B9590] focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-xl max-h-[92vh] overflow-y-auto" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div className="flex items-center justify-between p-5 border-b border-[#E8E4DE]">
          <h2 className="text-base font-semibold text-[#1A1714] flex items-center gap-2"><Sparkles size={16} className="text-[#8B1A2F]" />{step === 'form' ? 'Nouveau plan d\'assemblage IA' : step === 'generating' ? 'G\u00e9n\u00e9ration IA en cours\u2026' : step === 'done' ? 'Sc\u00e9narios g\u00e9n\u00e9r\u00e9s !' : 'Erreur'}</h2>
          {step !== 'generating' && <button onClick={onClose} className="text-[#9B9590] hover:text-[#1A1714] p-1.5 rounded-lg hover:bg-[#F5F3EF]"><X size={16} /></button>}
        </div>
        <div className="p-5">
          {step === 'generating' && <AIGenerationSteps />}
          {step === 'done' && result && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"><CheckCircle size={28} className="text-green-600" /></div>
              <h3 className="text-lg font-semibold text-[#1A1714] mb-1">{result.scenarios?.length || 0} sc\u00e9narios g\u00e9n\u00e9r\u00e9s !</h3>
              <p className="text-sm text-[#5C5550] mb-1">{result.lots_analyzed} lots analys\u00e9s</p>
              {result.used_fallback && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">\u26a0 Calcul manuel (OpenAI indisponible)</p>}
              <div className="flex gap-3 mt-6">
                <button onClick={onClose} className="flex-1 px-4 py-2 text-sm text-[#5C5550] border border-[#E8E4DE] rounded-lg hover:bg-[#F5F3EF]">Fermer</button>
                <button onClick={() => onCreated(result)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ backgroundColor: '#8B1A2F' }}><ChevronRight size={14} /> Voir les sc\u00e9narios</button>
              </div>
            </div>
          )}
          {step === 'error' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><X size={28} className="text-red-500" /></div>
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
              <button onClick={() => setStep('form')} className="px-5 py-2 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: '#8B1A2F' }}>R\u00e9essayer</button>
            </div>
          )}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
              <div><label className="block text-sm font-medium text-[#1A1714] mb-1">Nom du plan</label><input className={cls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-[#1A1714] mb-1">Volume cible (L) *</label><input type="number" className={cls} placeholder="10 000" value={form.target_volume} onChange={e => setForm({ ...form, target_volume: e.target.value })} required /></div>
                <div><label className="block text-sm font-medium text-[#1A1714] mb-1">Appellation</label><input className={cls} placeholder="ex. Saint-\u00c9milion" value={form.target_appellation} onChange={e => setForm({ ...form, target_appellation: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-[#1A1714] mb-1">Alcool min (%)</label><input type="number" step="0.1" className={cls} placeholder="12.0" value={form.target_alcohol_min} onChange={e => setForm({ ...form, target_alcohol_min: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-[#1A1714] mb-1">Alcool max (%)</label><input type="number" step="0.1" className={cls} placeholder="14.5" value={form.target_alcohol_max} onChange={e => setForm({ ...form, target_alcohol_max: e.target.value })} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-[#1A1714]">Lots candidats (min. 2) *</label>
                  {form.candidate_lot_ids.length > 0 && <span className="text-xs text-[#8B1A2F] font-medium">{Number(totalVol).toLocaleString('fr')} L s\u00e9lectionn\u00e9s</span>}
                </div>
                <div className="border border-[#E8E4DE] rounded-lg overflow-hidden">
                  <div className="max-h-44 overflow-y-auto divide-y divide-[#F5F3EF]">
                    {(lots as Lot[]).map(l => (
                      <label key={l.id} className={`flex items-center gap-3 cursor-pointer px-3 py-2.5 transition-colors ${form.candidate_lot_ids.includes(l.id) ? 'bg-[#FDF2F4]' : 'hover:bg-[#F5F3EF]'}`}>
                        <input type="checkbox" checked={form.candidate_lot_ids.includes(l.id)} onChange={() => toggleLot(l.id)} className="rounded accent-[#8B1A2F]" />
                        <div className="flex-1 min-w-0"><span className="text-sm text-[#1A1714] font-medium truncate block">{l.lot_number} \u2014 {l.name}</span><span className="text-xs text-[#9B9590]">{l.type} {l.vintage_year || ''}</span></div>
                        <span className="text-xs text-[#5C5550] whitespace-nowrap">{Number(l.current_volume_liters).toLocaleString('fr')} L</span>
                      </label>
                    ))}
                    {(lots as Lot[]).length === 0 && <p className="text-sm text-[#9B9590] text-center py-6">Aucun lot actif</p>}
                  </div>
                </div>
                <p className="text-xs text-[#9B9590] mt-1">{form.candidate_lot_ids.length} lot(s) s\u00e9lectionn\u00e9(s)</p>
              </div>
              {form.target_volume && form.candidate_lot_ids.length > 0 && (
                <div className={`rounded-lg px-3 py-2 text-xs border ${totalVol >= Number(form.target_volume) ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  {totalVol >= Number(form.target_volume) ? `\u2713 Volume suffisant (${Number(totalVol).toLocaleString('fr')} L dispo)` : `\u26a0 Volume insuffisant : ${Number(totalVol).toLocaleString('fr')} L disponibles`}
                </div>
              )}
              <div className="bg-[#FDF2F4] border border-[#F3C5CE] rounded-lg p-3">
                <p className="text-xs text-[#8B1A2F] flex items-center gap-1.5 mb-1 font-semibold"><Sparkles size={12} /> L'IA va g\u00e9n\u00e9rer 3 sc\u00e9narios d'assemblage</p>
                <p className="text-xs text-[#5C5550]">Calcul des combinaisons optimales selon vos objectifs. Dur\u00e9e estim\u00e9e : 15-30 secondes.</p>
              </div>
              <div className="flex gap-3 justify-end pt-1">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5550] border border-[#E8E4DE] rounded-lg hover:bg-[#F5F3EF]">Annuler</button>
                <button type="submit" disabled={form.candidate_lot_ids.length < 2} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: '#8B1A2F' }}><Sparkles size={14} /> G\u00e9n\u00e9rer les sc\u00e9narios</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssemblageAI() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const queryClient = useQueryClient();
  const { data: plans = [], isLoading } = useQuery<Plan[]>({ queryKey: ['assemblage-plans'], queryFn: () => api<Plan[]>('/ai/assemblage') });

  const handleCreated = (result: any) => {
    queryClient.invalidateQueries({ queryKey: ['assemblage-plans'] });
    setShowCreate(false);
    if (result.plan_id) {
      setTimeout(() => api<Plan[]>('/ai/assemblage').then(p => { const np = p.find((x: Plan) => x.id === result.plan_id); if (np) setSelectedPlan(np); }).catch(() => {}), 300);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1714] tracking-tight flex items-center gap-2"><GitMerge size={22} className="text-[#8B1A2F]" /> Assemblage IA</h1>
            <p className="text-sm text-[#5C5550] mt-1">Planification intelligente avec sc\u00e9narios g\u00e9n\u00e9r\u00e9s par IA</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm hover:opacity-90" style={{ backgroundColor: '#8B1A2F' }}><Sparkles size={16} /> Nouveau plan IA</button>
        </div>

        {plans.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Plans cr\u00e9\u00e9s', value: plans.length, color: 'text-[#8B1A2F]' },
              { label: 'Sc\u00e9narios pr\u00eats', value: plans.filter(p => p.status === 'scenarios_ready').length, color: 'text-green-600' },
              { label: 'Ex\u00e9cut\u00e9s', value: plans.filter(p => p.status === 'executed').length, color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-[#E8E4DE] px-4 py-3">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-[#9B9590]">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-[#E8E4DE] p-5 animate-pulse"><div className="h-4 bg-[#E8E4DE] rounded mb-3 w-3/4" /><div className="h-3 bg-[#F5F3EF] rounded mb-2" /></div>)}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-[#E8E4DE]">
            <GitMerge size={52} className="mx-auto mb-4 text-[#E8E4DE]" />
            <h3 className="text-[#1A1714] font-semibold text-lg mb-2">Aucun plan d'assemblage</h3>
            <p className="text-[#5C5550] text-sm mb-6 max-w-sm mx-auto">Cr\u00e9ez votre premier plan pour obtenir 3 sc\u00e9narios g\u00e9n\u00e9r\u00e9s par IA</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#8B1A2F' }}><Sparkles size={16} /> Cr\u00e9er mon premier plan IA</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plans.map(plan => {
              const bestScore = plan.scenarios?.length > 0 ? Math.max(...plan.scenarios.map(s => s.quality_score || 0)) : null;
              return (
                <div key={plan.id} className="bg-white rounded-xl border border-[#E8E4DE] p-5 cursor-pointer hover:border-[#8B1A2F]/30 hover:shadow-md transition-all duration-200" onClick={() => setSelectedPlan(plan)}>
                  <div className="flex justify-between items-start mb-3"><h3 className="font-semibold text-[#1A1714] text-sm pr-2">{plan.name}</h3><StatusBadge status={plan.status} /></div>
                  <div className="space-y-1.5 text-xs text-[#5C5550]">
                    <p>🎯 Volume cible : <span className="text-[#1A1714] font-medium">{Number(plan.target_volume_liters).toLocaleString('fr')} L</span></p>
                    {plan.target_appellation && <p>🏷️ {plan.target_appellation}</p>}
                    <div className="flex items-center justify-between">
                      <p>🧪 {(plan.scenarios || []).length} sc\u00e9nario{(plan.scenarios || []).length > 1 ? 's' : ''}</p>
                      {bestScore != null && <span className="font-mono font-bold text-[#8B1A2F]">\u2605 {bestScore}/100</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F5F3EF]">
                    <p className="text-xs text-[#9B9590]">{new Date(plan.created_at).toLocaleDateString('fr-FR')}{plan.created_by_name && ` \u00b7 ${plan.created_by_name}`}</p>
                    <ChevronRight size={14} className="text-[#9B9590]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedPlan && <PlanDetailModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}
        {showCreate && <CreatePlanModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      </div>
    </div>
  );
}
