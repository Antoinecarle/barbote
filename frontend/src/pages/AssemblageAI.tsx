/**
 * AssemblageAI.tsx — Deep Feature Dive v2
 * Upgrades: enhanced empty state, plan card hover/preview, comparison table,
 * AI progress with tips + time remaining, expanded selection reasoning panel
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  GitMerge, Sparkles, CheckCircle, TrendingUp,
  ChevronRight, X, Info, AlertTriangle, Play, Award,
  Brain, BarChart3, Scale, Eye
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lot {
  id: string;
  lot_number: string;
  name: string;
  type: string;
  vintage_year: number;
  current_volume_liters: number;
  appellation?: string;
}

interface Scenario {
  id: string;
  name: string;
  lots: Array<{ lot_id: string; lot_number: string; percentage: number; volume_liters: number }>;
  predicted_analysis: Record<string, number>;
  quality_score: number;
  profile: string;
  reasoning: string;
  risks: string[];
  advantages: string[];
  is_fallback?: boolean;
}

interface Plan {
  id: string;
  name: string;
  target_volume_liters: number;
  target_appellation?: string;
  status: string;
  scenarios: Scenario[];
  created_at: string;
  created_by_name?: string;
  used_fallback?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ANALYSIS_PARAMS = [
  { key: 'alcohol_percent', label: 'Alcool', unit: '%', min: 9, max: 16, optMin: 12, optMax: 14.5 },
  { key: 'total_acidity_gl', label: 'Acid. totale', unit: 'g/L', min: 2, max: 9, optMin: 4, optMax: 7 },
  { key: 'volatile_acidity_gl', label: 'Acid. vol.', unit: 'g/L', min: 0, max: 1, optMin: 0, optMax: 0.6, alert: (v: number) => v > 0.6 },
  { key: 'ph', label: 'pH', unit: '', min: 2.8, max: 4.2, optMin: 3.2, optMax: 3.8 },
  { key: 'free_so2_mgl', label: 'SO\u2082 libre', unit: 'mg/L', min: 0, max: 60, optMin: 20, optMax: 35, alert: (v: number) => v < 15 },
];

// Comparison table param set (subset with display labels)
const COMPARISON_PARAMS = [
  { key: 'alcohol_percent', label: 'Alcool', unit: '%', higherIsBetter: true },
  { key: 'total_acidity_gl', label: 'Acidité tot.', unit: 'g/L', higherIsBetter: false },
  { key: 'ph', label: 'pH', unit: '', higherIsBetter: false },
  { key: 'free_so2_mgl', label: 'SO\u2082 libre', unit: 'mg/L', higherIsBetter: true },
];

const AI_STEPS = [
  { id: 1, label: 'Analyse des lots candidats\u2026', icon: '\ud83c\udf77', duration: 2500 },
  { id: 2, label: 'Extraction des profils analytiques\u2026', icon: '\ud83d\udd2c', duration: 3000 },
  { id: 3, label: 'Calcul des combinaisons optimales\u2026', icon: '\u2696\ufe0f', duration: 4000 },
  { id: 4, label: 'G\u00e9n\u00e9ration des 3 sc\u00e9narios IA\u2026', icon: '\ud83e\udde0', duration: 5000 },
  { id: 5, label: 'Calcul des matrices d\'analyses\u2026', icon: '\ud83d\udcca', duration: 3000 },
  { id: 6, label: 'V\u00e9rification conformit\u00e9 r\u00e9glementaire\u2026', icon: '\u2705', duration: 2000 },
];

const AI_TIPS = [
  '\ud83d\udca1 L\'IA analyse les profils analytiques de chaque lot...',
  '\ud83d\udca1 Calcul des ratios d\'équilibre alcool\u202f/\u202facidité...',
  '\ud83d\udca1 Identification des combinaisons à faible risque organoleptique...',
  '\ud83d\udca1 Modélisation des interactions entre cépages...',
  '\ud83d\udca1 Optimisation des proportions selon vos objectifs de volume...',
  '\ud83d\udca1 Vérification de la conformité AOC de chaque scénario...',
];

// ─── StatusBadge ───────────────────────────────────────────────────────────────

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
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}
    >
      {c.label}
    </span>
  );
}

// ─── AnalysisGauge ─────────────────────────────────────────────────────────────

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
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: mounted ? `${pct}%` : '0%', backgroundColor: isAlert ? '#DC2626' : isOk ? '#16A34A' : '#8B1A2F' }}
        />
      </div>
    </div>
  );
}

// ─── ProportionBar ─────────────────────────────────────────────────────────────

function ProportionBar({ percentage, lotNumber, volume }: { percentage: number; lotNumber: string; volume: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 150); return () => clearTimeout(t); }, []);
  const safeNumber = String(lotNumber ?? '0');
  const hue = (parseInt(safeNumber.replace(/\D/g, '') || '0') * 47) % 360;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#1A1714] font-medium">{lotNumber}</span>
        <span className="text-[#5C5550]">{percentage}% · {Number(volume).toLocaleString('fr')} L</span>
      </div>
      <div className="h-2 bg-[#E8E4DE] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: mounted ? `${percentage}%` : '0%', backgroundColor: `hsl(${hue},55%,48%)` }}
        />
      </div>
    </div>
  );
}

// ─── MiniProportionBar (plan card preview) ─────────────────────────────────────

function MiniProportionBar({ lots }: { lots: Array<{ lot_number: string; percentage: number }> }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 120); return () => clearTimeout(t); }, []);
  const safeLots = (lots ?? []).filter(l => l != null);
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden gap-px bg-[#E8E4DE]">
      {safeLots.map((l, i) => {
        const hue = (parseInt(String(l.lot_number ?? i).replace(/\D/g, '') || String(i)) * 47) % 360;
        const pct = l.percentage ?? 0;
        return (
          <div
            key={i}
            className="h-full transition-all duration-700 ease-out"
            title={`${l.lot_number ?? '?'}: ${pct}%`}
            style={{ width: mounted ? `${pct}%` : '0%', backgroundColor: `hsl(${hue},55%,48%)` }}
          />
        );
      })}
    </div>
  );
}

// ─── ScenarioComparisonTable ───────────────────────────────────────────────────

function ScenarioComparisonTable({ scenarios }: { scenarios: Scenario[] }) {
  if (scenarios.length === 0) return null;

  // For each param row, find the best value index
  const getBestIdx = (paramKey: string, higherIsBetter: boolean): number => {
    const values = scenarios.map(s => s.predicted_analysis?.[paramKey] ?? null);
    if (values.every(v => v === null)) return -1;
    let bestIdx = 0;
    let bestVal = values[0] ?? (higherIsBetter ? -Infinity : Infinity);
    values.forEach((v, i) => {
      if (v === null) return;
      if (higherIsBetter ? v > bestVal : v < bestVal) { bestVal = v; bestIdx = i; }
    });
    return bestIdx;
  };

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide mb-3">
        Comparaison des paramètres
      </p>
      <div className="border border-[#E8E4DE] rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#F5F3EF] border-b border-[#E8E4DE]">
              <th className="text-left px-4 py-2.5 text-[#5C5550] font-semibold w-36">Paramètre</th>
              {scenarios.map((s, i) => (
                <th key={s.id} className="text-center px-3 py-2.5 font-semibold text-[#1A1714]">
                  <span className="block">{s.name}</span>
                  {i === 0 && <span className="text-amber-600 font-normal text-[10px]">Recommandé</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F5F3EF]">
            {COMPARISON_PARAMS.map(param => {
              const bestIdx = getBestIdx(param.key, param.higherIsBetter);
              return (
                <tr key={param.key} className="hover:bg-[#F5F3EF]/60 transition-colors">
                  <td className="px-4 py-2.5 text-[#5C5550] font-medium">{param.label}</td>
                  {scenarios.map((s, i) => {
                    const val = s.predicted_analysis?.[param.key];
                    const isBest = i === bestIdx && val != null;
                    return (
                      <td key={s.id} className="text-center px-3 py-2.5">
                        {val != null ? (
                          <span
                            className={`inline-block font-mono font-semibold px-2 py-0.5 rounded ${
                              isBest
                                ? 'bg-green-100 text-green-800'
                                : 'text-[#1A1714]'
                            }`}
                          >
                            {val.toFixed(1)}{param.unit}
                            {isBest && <span className="ml-1 text-green-600 text-[10px]">✓</span>}
                          </span>
                        ) : (
                          <span className="text-[#9B9590]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Quality score row */}
            <tr className="bg-[#FDF2F4]/40 hover:bg-[#FDF2F4] transition-colors border-t-2 border-[#F3C5CE]">
              <td className="px-4 py-2.5 text-[#5C5550] font-semibold">Score qualité</td>
              {scenarios.map((s, i) => {
                const allScores = scenarios.map(sc => sc.quality_score);
                const isBest = s.quality_score === Math.max(...allScores);
                return (
                  <td key={s.id} className="text-center px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded ${isBest ? 'bg-amber-100 text-amber-800' : 'text-[#8B1A2F]'}`}>
                      {isBest && <span className="text-amber-500">★</span>}
                      {s.quality_score}
                      <span className="text-[10px] font-normal opacity-60">/100</span>
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── AIGenerationSteps (enhanced) ─────────────────────────────────────────────

function AIGenerationSteps() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [tipIndex, setTipIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(AI_STEPS.reduce((s, st) => s + st.duration, 0) / 1000));

  // Advance through steps
  useEffect(() => {
    let delay = 0;
    AI_STEPS.forEach((step, i) => {
      const d = delay;
      delay += step.duration;
      setTimeout(() => {
        setCurrentStep(i + 1);
        setCompletedSteps(p => [...p, step.id]);
      }, d + step.duration * 0.3);
    });
  }, []);

  // Rotate tips every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => setTipIndex(i => (i + 1) % AI_TIPS.length), 4000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalDuration = AI_STEPS.reduce((s, st) => s + st.duration, 0);
  const elapsed = AI_STEPS.slice(0, completedSteps.length).reduce((s, st) => s + st.duration, 0);
  const progressPct = Math.round((elapsed / totalDuration) * 100);

  return (
    <div className="py-4 px-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-full bg-[#FDF2F4] border border-[#F3C5CE] flex items-center justify-center">
          <Sparkles size={16} className="text-[#8B1A2F] animate-pulse" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1A1714]">IA en cours de calcul…</p>
          <p className="text-xs text-[#9B9590]">Patientez, les scénarios sont générés pour vous</p>
        </div>
        {secondsLeft > 0 && (
          <div className="text-right">
            <p className="text-xs font-semibold text-[#8B1A2F] font-mono">~{secondsLeft}s</p>
            <p className="text-[10px] text-[#9B9590]">restantes</p>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {AI_STEPS.map((step, i) => {
          const done = completedSteps.includes(step.id);
          const active = currentStep === i + 1 && !done;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 transition-all duration-300 ${i >= currentStep ? 'opacity-30' : 'opacity-100'}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${done ? 'bg-green-100 border border-green-200' : active ? 'bg-[#FDF2F4] border border-[#F3C5CE]' : 'bg-[#F5F3EF] border border-[#E8E4DE]'}`}>
                {done ? '\u2713' : step.icon}
              </div>
              <span className={`text-sm ${done ? 'text-green-700 line-through decoration-green-400' : active ? 'text-[#8B1A2F] font-medium' : 'text-[#9B9590]'}`}>
                {step.label}
              </span>
              {active && (
                <span className="ml-auto flex gap-0.5">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#8B1A2F] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar with percentage */}
      <div className="mt-5">
        <div className="h-2 bg-[#E8E4DE] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#8B1A2F] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-[#9B9590]">{completedSteps.length}/{AI_STEPS.length} étapes</p>
          <p className="text-xs font-semibold text-[#8B1A2F] font-mono">{progressPct}%</p>
        </div>
      </div>

      {/* Rotating tip */}
      <div className="mt-4 px-3 py-2.5 bg-[#F5F3EF] border border-[#E8E4DE] rounded-lg min-h-[36px]">
        <p className="text-xs text-[#5C5550] leading-relaxed transition-all duration-500" key={tipIndex}>
          {AI_TIPS[tipIndex]}
        </p>
      </div>
    </div>
  );
}

// ─── PlanDetailModal ───────────────────────────────────────────────────────────

// Normalize a scenario from any DB format to the expected frontend format
function normalizeScenario(s: any): Scenario {
  return {
    id: s.id ?? '',
    name: s.name ?? 'Scénario',
    lots: (s.lots ?? s.blend ?? []).map((l: any) => ({
      lot_id: l.lot_id ?? '',
      lot_number: l.lot_number ?? '?',
      percentage: l.percentage ?? l.percent ?? 0,
      volume_liters: l.volume_liters ?? l.volume ?? 0,
    })),
    predicted_analysis: s.predicted_analysis ?? {},
    quality_score: s.quality_score ?? s.score ?? s.predicted_score ?? 0,
    profile: s.profile ?? '',
    reasoning: s.reasoning ?? s.ai_comment ?? '',
    risks: Array.isArray(s.risks) ? s.risks : [],
    advantages: Array.isArray(s.advantages) ? s.advantages : [],
    is_fallback: s.is_fallback ?? false,
  };
}

function PlanDetailModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const scenarios = (plan.scenarios ?? []).map(normalizeScenario);
  const [selected, setSelected] = useState<string | null>(null);
  const [reasoningVisible, setReasoningVisible] = useState(false);
  const sorted = [...scenarios].sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));
  const selectedScenario = selected ? scenarios.find(sc => sc.id === selected) : null;
  const totalLotsInvolved = selectedScenario ? selectedScenario.lots.length : 0;

  const handleSelect = (id: string) => {
    if (selected === id) {
      setSelected(null);
      setReasoningVisible(false);
    } else {
      setSelected(id);
      // Delay the slide-in for a smoother entrance after selection state renders
      setTimeout(() => setReasoningVisible(true), 80);
    }
  };

  /* Overlay — bottom-sheet on mobile, centered dialog on sm+ */
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="bg-white w-full sm:max-w-5xl sm:rounded-xl rounded-t-xl sm:my-4 max-h-[95vh] sm:max-h-[90vh] flex flex-col"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
      >
        {/* Sticky header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-[#E8E4DE] flex-shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-base sm:text-lg font-semibold text-[#1A1714] truncate">{plan.name}</h2>
              <StatusBadge status={plan.status} />
              {plan.used_fallback && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
                  <Info size={10} /> Calcul manuel
                </span>
              )}
            </div>
            <p className="text-sm text-[#5C5550]">
              Volume cible : {Number(plan.target_volume_liters).toLocaleString('fr')} L
              {plan.target_appellation && ` · ${plan.target_appellation}`}
            </p>
          </div>
          {/* Touch-friendly 44x44 close button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] text-[#9B9590] hover:text-[#1A1714] rounded-lg hover:bg-[#F5F3EF] transition-colors flex-shrink-0"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
        {scenarios.length === 0 ? (
          <div className="text-center py-16 text-[#9B9590]">
            <p className="text-4xl mb-3">\ud83c\udf77</p>Aucun scénario disponible
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            {/* Best scenario banner */}
            <div className="flex items-center gap-2 mb-5 px-3 py-2 bg-[#FDF2F4] border border-[#F3C5CE] rounded-lg">
              <Award size={14} className="text-[#8B1A2F]" />
              <span className="text-xs text-[#8B1A2F] font-medium">
                Meilleur scénario : <strong>{sorted[0]?.name}</strong> (score {sorted[0]?.quality_score}/100)
              </span>
            </div>

            {/* Scenario cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {sorted.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => handleSelect(s.id)}
                  className={`rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ${
                    selected === s.id
                      ? 'border-[#8B1A2F] bg-[#FDF2F4]'
                      : i === 0
                        ? 'border-amber-300 bg-amber-50/50'
                        : 'border-[#E8E4DE] hover:border-[#8B1A2F]/40'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      {i === 0 && (
                        <span className="text-xs text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-full mb-1.5 inline-block">
                          ★ Recommandé
                        </span>
                      )}
                      <h3 className="font-semibold text-[#1A1714] text-sm">{s.name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#8B1A2F] font-mono">{s.quality_score}</div>
                      <div className="text-xs text-[#9B9590]">/100</div>
                    </div>
                  </div>

                  {/* Composition */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide mb-2">Composition</p>
                    {s.lots.map((l, j) => (
                      <ProportionBar key={j} lotNumber={l.lot_number} percentage={l.percentage} volume={l.volume_liters} />
                    ))}
                  </div>

                  {/* Analysis gauges */}
                  {s.predicted_analysis && Object.keys(s.predicted_analysis).length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide">Analyse prédite</p>
                      {ANALYSIS_PARAMS.filter(p => s.predicted_analysis[p.key] != null).map(param => (
                        <AnalysisGauge key={param.key} param={param} value={s.predicted_analysis[param.key]} />
                      ))}
                    </div>
                  )}

                  {s.profile && <p className="text-xs text-[#5C5550] italic mb-3">{s.profile}</p>}
                  {s.advantages?.slice(0, 2).map((a, j) => (
                    <p key={j} className="text-xs text-green-700">✓ {a}</p>
                  ))}
                  {s.risks?.[0] && (
                    <p className="text-xs text-amber-700 flex items-start gap-1 mt-1">
                      <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" /> {s.risks[0]}
                    </p>
                  )}

                  {/* Selected indicator */}
                  {selected === s.id && (
                    <div className="mt-3 pt-3 border-t border-[#F3C5CE]">
                      <p className="text-xs text-[#8B1A2F] font-medium flex items-center gap-1">
                        <CheckCircle size={12} /> Scénario sélectionné
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Comparison table */}
            <ScenarioComparisonTable scenarios={sorted} />

            {/* Expanded reasoning panel — slides in on selection */}
            {selected && selectedScenario && (
              <div
                className="mt-5 overflow-hidden transition-all duration-300 ease-out"
                style={{
                  maxHeight: reasoningVisible ? '600px' : '0px',
                  opacity: reasoningVisible ? 1 : 0,
                  transform: reasoningVisible ? 'translateY(0)' : 'translateY(8px)',
                }}
              >
                <div className="p-5 bg-[#F5F3EF] rounded-xl border border-[#E8E4DE]">
                  <p className="text-xs font-semibold text-[#5C5550] uppercase tracking-wide mb-3">
                    Raisonnement IA — {selectedScenario.name}
                  </p>
                  {selectedScenario.reasoning && (
                    <p className="text-sm text-[#1A1714] leading-relaxed mb-4">{selectedScenario.reasoning}</p>
                  )}
                  {/* Advantages & risks detail */}
                  {(selectedScenario.advantages?.length > 0 || selectedScenario.risks?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {selectedScenario.advantages?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 mb-1.5">Avantages</p>
                          <ul className="space-y-1">
                            {selectedScenario.advantages.map((a, i) => (
                              <li key={i} className="text-xs text-green-700 flex items-start gap-1.5">
                                <span className="mt-0.5 flex-shrink-0">✓</span>{a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {selectedScenario.risks?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-amber-700 mb-1.5">Risques</p>
                          <ul className="space-y-1">
                            {selectedScenario.risks.map((r, i) => (
                              <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                                <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />{r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Proceed to execution CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#E8E4DE]">
                    <p className="text-xs text-[#9B9590]">
                      {totalLotsInvolved} lot{totalLotsInvolved > 1 ? 's' : ''} impliqué{totalLotsInvolved > 1 ? 's' : ''} dans ce scénario
                    </p>
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
                      style={{ backgroundColor: '#8B1A2F' }}
                    >
                      <Play size={14} />
                      Procéder à l'exécution ({totalLotsInvolved} lots)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer actions — flex-wrap prevents overflow on narrow screens */}
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-[#E8E4DE]">
              <button onClick={onClose} className="px-4 py-2 min-h-[44px] text-sm font-medium text-[#5C5550] border border-[#E8E4DE] rounded-lg hover:bg-[#F5F3EF] transition-colors">
                Fermer
              </button>
              {selected && (
                <button className="flex items-center gap-2 px-5 py-2 min-h-[44px] text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-opacity" style={{ backgroundColor: '#8B1A2F' }}>
                  <Play size={14} /> Exécuter ce scénario
                </button>
              )}
              <div className="ml-auto text-xs text-[#9B9590] self-center">
                {scenarios.length} scénario{scenarios.length > 1 ? 's' : ''} générés
              </div>
            </div>
          </div>
        )}
        </div>{/* end scrollable body */}
      </div>
    </div>
  );
}

// ─── CreatePlanModal ───────────────────────────────────────────────────────────

function CreatePlanModal({ onClose, onCreated }: { onClose: () => void; onCreated: (plan: any) => void }) {
  const { data: lots = [] } = useQuery<Lot[]>({ queryKey: ['lots-active'], queryFn: () => api<Lot[]>('/lots?status=active') });
  const [form, setForm] = useState({
    name: `Plan ${new Date().toLocaleDateString('fr-FR')}`,
    target_volume: '',
    target_appellation: '',
    target_vintage_year: new Date().getFullYear(),
    target_alcohol_min: '',
    target_alcohol_max: '',
    candidate_lot_ids: [] as string[],
  });
  const [step, setStep] = useState<'form' | 'generating' | 'done' | 'error'>('form');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const toggleLot = (id: string) =>
    setForm(f => ({
      ...f,
      candidate_lot_ids: f.candidate_lot_ids.includes(id)
        ? f.candidate_lot_ids.filter(l => l !== id)
        : [...f.candidate_lot_ids, id],
    }));

  const selectedLots = (lots as Lot[]).filter(l => form.candidate_lot_ids.includes(l.id));
  const totalVol = selectedLots.reduce((s, l) => s + Number(l.current_volume_liters), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.candidate_lot_ids.length < 2) { setError('Sélectionnez au moins 2 lots candidats'); return; }
    setError(''); setStep('generating');
    try {
      const data = await api<any>('/ai/assemblage', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          target_volume: Number(form.target_volume),
          target_analysis: {
            appellation: form.target_appellation || undefined,
            vintage_year: form.target_vintage_year,
            alcohol_min: Number(form.target_alcohol_min) || undefined,
            alcohol_max: Number(form.target_alcohol_max) || undefined,
          },
          candidate_lot_ids: form.candidate_lot_ids,
        }),
      });
      setResult(data); setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur'); setStep('error');
    }
  };

  const cls = 'w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#1A1714] placeholder-[#9B9590] focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] transition-colors';

  /* Bottom-sheet on mobile, centered on sm+ */
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="bg-white w-full sm:max-w-xl sm:rounded-xl rounded-t-xl max-h-[95vh] sm:max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#E8E4DE] sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-[#1A1714] flex items-center gap-2 min-w-0">
            <Sparkles size={16} className="text-[#8B1A2F] flex-shrink-0" />
            <span className="truncate">
              {step === 'form' ? "Nouveau plan d'assemblage IA"
                : step === 'generating' ? 'Génération IA en cours\u2026'
                : step === 'done' ? 'Scénarios générés !'
                : 'Erreur'}
            </span>
          </h2>
          {step !== 'generating' && (
            <button
              onClick={onClose}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] text-[#9B9590] hover:text-[#1A1714] rounded-lg hover:bg-[#F5F3EF] flex-shrink-0"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="p-5">
          {step === 'generating' && <AIGenerationSteps />}

          {step === 'done' && result && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-[#1A1714] mb-1">{result.scenarios?.length || 0} scénarios générés !</h3>
              <p className="text-sm text-[#5C5550] mb-1">{result.lots_analyzed} lots analysés</p>
              {result.used_fallback && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                  ⚠ Calcul manuel (OpenAI indisponible)
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-6">
                <button onClick={onClose} className="flex-1 px-4 py-2 min-h-[44px] text-sm text-[#5C5550] border border-[#E8E4DE] rounded-lg hover:bg-[#F5F3EF]">Fermer</button>
                <button onClick={() => onCreated(result)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] text-sm font-semibold text-white rounded-lg" style={{ backgroundColor: '#8B1A2F' }}>
                  <ChevronRight size={14} /> Voir les scénarios
                </button>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <X size={28} className="text-red-500" />
              </div>
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
              <button onClick={() => setStep('form')} className="px-5 py-2 min-h-[44px] text-sm font-medium text-white rounded-lg" style={{ backgroundColor: '#8B1A2F' }}>
                Réessayer
              </button>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-[#1A1714] mb-1">Nom du plan</label>
                <input className={cls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              {/* 2-col on sm+, 1-col on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1A1714] mb-1">Volume cible (L) *</label>
                  <input type="number" className={cls} placeholder="10 000" value={form.target_volume} onChange={e => setForm({ ...form, target_volume: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1714] mb-1">Appellation</label>
                  <input className={cls} placeholder="ex. Saint-Émilion" value={form.target_appellation} onChange={e => setForm({ ...form, target_appellation: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1A1714] mb-1">Alcool min (%)</label>
                  <input type="number" step="0.1" className={cls} placeholder="12.0" value={form.target_alcohol_min} onChange={e => setForm({ ...form, target_alcohol_min: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1714] mb-1">Alcool max (%)</label>
                  <input type="number" step="0.1" className={cls} placeholder="14.5" value={form.target_alcohol_max} onChange={e => setForm({ ...form, target_alcohol_max: e.target.value })} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-[#1A1714]">Lots candidats (min. 2) *</label>
                  {form.candidate_lot_ids.length > 0 && (
                    <span className="text-xs text-[#8B1A2F] font-medium">{Number(totalVol).toLocaleString('fr')} L sélectionnés</span>
                  )}
                </div>
                <div className="border border-[#E8E4DE] rounded-lg overflow-hidden">
                  <div className="max-h-44 overflow-y-auto divide-y divide-[#F5F3EF]">
                    {(lots as Lot[]).map(l => (
                      <label key={l.id} className={`flex items-center gap-3 cursor-pointer px-3 py-2.5 min-h-[44px] transition-colors ${form.candidate_lot_ids.includes(l.id) ? 'bg-[#FDF2F4]' : 'hover:bg-[#F5F3EF]'}`}>
                        <input type="checkbox" checked={form.candidate_lot_ids.includes(l.id)} onChange={() => toggleLot(l.id)} className="rounded accent-[#8B1A2F]" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-[#1A1714] font-medium truncate block">{l.lot_number} — {l.name}</span>
                          <span className="text-xs text-[#9B9590]">{l.type} {l.vintage_year || ''}</span>
                        </div>
                        <span className="text-xs text-[#5C5550] whitespace-nowrap">{Number(l.current_volume_liters).toLocaleString('fr')} L</span>
                      </label>
                    ))}
                    {(lots as Lot[]).length === 0 && <p className="text-sm text-[#9B9590] text-center py-6">Aucun lot actif</p>}
                  </div>
                </div>
                <p className="text-xs text-[#9B9590] mt-1">{form.candidate_lot_ids.length} lot(s) sélectionné(s)</p>
              </div>
              {form.target_volume && form.candidate_lot_ids.length > 0 && (
                <div className={`rounded-lg px-3 py-2 text-xs border ${totalVol >= Number(form.target_volume) ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  {totalVol >= Number(form.target_volume)
                    ? `\u2713 Volume suffisant (${Number(totalVol).toLocaleString('fr')} L dispo)`
                    : `\u26a0 Volume insuffisant\u00a0: ${Number(totalVol).toLocaleString('fr')} L disponibles`}
                </div>
              )}
              <div className="bg-[#FDF2F4] border border-[#F3C5CE] rounded-lg p-3">
                <p className="text-xs text-[#8B1A2F] flex items-center gap-1.5 mb-1 font-semibold">
                  <Sparkles size={12} /> L'IA va générer 3 scénarios d'assemblage
                </p>
                <p className="text-xs text-[#5C5550]">Calcul des combinaisons optimales selon vos objectifs. Durée estimée : 15-30 secondes.</p>
              </div>
              {/* Footer — flex-wrap so buttons stack on very narrow screens */}
              <div className="flex flex-wrap gap-3 justify-end pt-1">
                <button type="button" onClick={onClose} className="px-4 py-2 min-h-[44px] text-sm font-medium text-[#5C5550] border border-[#E8E4DE] rounded-lg hover:bg-[#F5F3EF]">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={form.candidate_lot_ids.length < 2}
                  className="flex items-center gap-2 px-5 py-2 min-h-[44px] text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                  style={{ backgroundColor: '#8B1A2F' }}
                >
                  <Sparkles size={14} /> Générer les scénarios
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PlanCard (enhanced) ───────────────────────────────────────────────────────

function PlanCard({ plan, onClick }: { plan: Plan; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const scenarios = (plan.scenarios ?? []).map(normalizeScenario);
  const bestScore = scenarios.length > 0 ? Math.max(...scenarios.map(s => s.quality_score || 0)) : null;
  const bestScenario = scenarios.length > 0 ? [...scenarios].sort((a, b) => b.quality_score - a.quality_score)[0] : null;
  const isReady = plan.status === 'scenarios_ready';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="assemblage-card relative bg-white rounded-xl border border-[#E8E4DE] p-5 cursor-pointer overflow-hidden group"
      style={{
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 8px 24px rgba(139,26,47,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
        borderColor: hovered ? 'rgba(139,26,47,0.3)' : '#E8E4DE',
      }}
    >
      {/* Pulsing green dot for scenarios_ready */}
      {isReady && (
        <span
          className="absolute top-4 right-4 w-2 h-2 rounded-full bg-green-500"
          style={{ boxShadow: '0 0 0 0 rgba(34,197,94,0.5)', animation: 'pulse-ring 1.8s ease-in-out infinite' }}
          title="Scénarios prêts"
        />
      )}

      {/* "Voir les scénarios" hover overlay */}
      <div
        className="absolute inset-0 rounded-xl flex items-center justify-center pointer-events-none"
        style={{
          background: 'rgba(139,26,47,0.06)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.18s ease',
        }}
      >
        <span
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: '#8B1A2F', boxShadow: '0 4px 12px rgba(139,26,47,0.25)' }}
        >
          <Eye size={14} /> Voir les scénarios
        </span>
      </div>

      {/* Content */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-[#1A1714] text-sm pr-6 leading-snug">{plan.name}</h3>
        <StatusBadge status={plan.status} />
      </div>

      <div className="space-y-1.5 text-xs text-[#5C5550]">
        <p>Volume cible : <span className="text-[#1A1714] font-medium">{Number(plan.target_volume_liters).toLocaleString('fr')} L</span></p>
        {plan.target_appellation && <p>{plan.target_appellation}</p>}
        <div className="flex items-center justify-between">
          <p>{scenarios.length} scénario{scenarios.length > 1 ? 's' : ''}</p>
          {bestScore != null && (
            <span className="font-mono font-bold text-[#8B1A2F]">★ {bestScore}/100</span>
          )}
        </div>
      </div>

      {/* Mini proportion bar preview from best scenario */}
      {bestScenario && bestScenario.lots.length > 0 && (
        <div className="mt-3 mb-1">
          <p className="text-[10px] text-[#9B9590] uppercase tracking-wide mb-1.5 font-medium">Composition — {bestScenario.name}</p>
          <MiniProportionBar lots={bestScenario.lots} />
          <div className="flex flex-wrap gap-x-3 mt-1.5">
            {bestScenario.lots.slice(0, 4).map((l, i) => {
              const hue = (parseInt(l.lot_number.replace(/\D/g, '') || String(i)) * 47) % 360;
              return (
                <span key={i} className="text-[10px] text-[#9B9590] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: `hsl(${hue},55%,48%)` }} />
                  {l.lot_number} {l.percentage}%
                </span>
              );
            })}
            {bestScenario.lots.length > 4 && <span className="text-[10px] text-[#9B9590]">+{bestScenario.lots.length - 4}</span>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F5F3EF]">
        <p className="text-xs text-[#9B9590]">
          {new Date(plan.created_at).toLocaleDateString('fr-FR')}
          {plan.created_by_name && ` \u00b7 ${plan.created_by_name}`}
        </p>
        <ChevronRight size={14} className="text-[#9B9590]" style={{ transition: 'transform 0.15s ease', transform: hovered ? 'translateX(3px)' : 'translateX(0)' }} />
      </div>
    </div>
  );
}

// ─── EmptyState (enhanced) ─────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-[#E8E4DE] py-16 px-8 text-center">
      {/* Illustration area */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          {/* Background glow */}
          <div className="absolute inset-0 rounded-full bg-[#FDF2F4] blur-xl opacity-80" style={{ transform: 'scale(1.4)' }} />
          <div className="relative w-20 h-20 rounded-full bg-[#FDF2F4] border-2 border-[#F3C5CE] flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              {/* Wine glass silhouette */}
              <path d="M14 6 H26 L24 18 Q24 24 20 26 Q16 24 16 18 Z" fill="#F3C5CE" stroke="#8B1A2F" strokeWidth="1.2" strokeLinejoin="round" />
              <line x1="20" y1="26" x2="20" y2="33" stroke="#8B1A2F" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="15" y1="33" x2="25" y2="33" stroke="#8B1A2F" strokeWidth="1.5" strokeLinecap="round" />
              {/* Sparkle top-right */}
              <path d="M29 8 L30 11 L33 12 L30 13 L29 16 L28 13 L25 12 L28 11 Z" fill="#8B1A2F" opacity="0.7" />
              {/* Sparkle bottom-left */}
              <path d="M9 22 L9.8 24.2 L12 25 L9.8 25.8 L9 28 L8.2 25.8 L6 25 L8.2 24.2 Z" fill="#8B1A2F" opacity="0.4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Copy */}
      <h3 className="text-[#1A1714] font-bold text-xl mb-2">Créez votre premier plan d'assemblage IA</h3>
      <p className="text-[#5C5550] text-sm mb-8 max-w-md mx-auto leading-relaxed">
        L'IA analyse vos lots disponibles et génère 3 scénarios d'assemblage optimisés selon vos objectifs de volume, d'appellation et de profil analytique.
      </p>

      {/* Feature bullets */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 max-w-xl mx-auto">
        {[
          { icon: Brain, label: '3 scénarios IA', desc: 'Générés automatiquement selon vos lots' },
          { icon: BarChart3, label: 'Analyses prédites', desc: 'Alcool, acidité, SO2 calculés' },
          { icon: Scale, label: 'Proportions optimales', desc: 'Équilibre alcool\u202f/\u202facidité optimisé' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-2 px-4 py-4 bg-[#F5F3EF] rounded-xl border border-[#E8E4DE]">
            <div className="w-9 h-9 rounded-full bg-[#FDF2F4] border border-[#F3C5CE] flex items-center justify-center">
              <Icon size={16} className="text-[#8B1A2F]" />
            </div>
            <p className="text-sm font-semibold text-[#1A1714]">{label}</p>
            <p className="text-xs text-[#9B9590] text-center leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#8B1A2F' }}
      >
        <Sparkles size={16} /> Créer mon premier plan IA
      </button>
    </div>
  );
}

// ─── Root page ─────────────────────────────────────────────────────────────────

// Pulse-ring keyframe injected once via a style tag
const PULSE_STYLE = `
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
  70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
}
`;

export default function AssemblageAI() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ['assemblage-plans'],
    queryFn: () => api<Plan[]>('/ai/assemblage'),
  });

  const handleCreated = (result: any) => {
    queryClient.invalidateQueries({ queryKey: ['assemblage-plans'] });
    setShowCreate(false);
    if (result.plan_id) {
      setTimeout(() =>
        api<Plan[]>('/ai/assemblage')
          .then(p => { const np = p.find((x: Plan) => x.id === result.plan_id); if (np) setSelectedPlan(np); })
          .catch(() => {}),
        300
      );
    }
  };

  useGSAP(() => {
    if (isLoading) return;
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('.assemblage-header', { y: -20, opacity: 0, duration: 0.5 });
    tl.from('.assemblage-stat', { y: 24, opacity: 0, stagger: 0.08, duration: 0.5 }, '-=0.2');
    tl.from('.assemblage-card', { y: 24, opacity: 0, stagger: 0.1, duration: 0.5 }, '-=0.2');
  }, { scope: containerRef, dependencies: [isLoading] });

  return (
    <div ref={containerRef} className="min-h-screen bg-[#F5F3EF]">
      {/* Inject pulse-ring keyframe */}
      <style>{PULSE_STYLE}</style>

      {/* px-4 on mobile, px-6 on sm+ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
        {/* Page header — flex-wrap prevents overflow on narrow screens */}
        <div className="assemblage-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1A1714] tracking-tight flex items-center gap-2">
              <GitMerge size={22} className="text-[#8B1A2F] flex-shrink-0" /> Assemblage IA
            </h1>
            <p className="text-sm text-[#5C5550] mt-1">Planification intelligente avec scénarios générés par IA</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#8B1A2F' }}
          >
            <Sparkles size={16} /> Nouveau plan IA
          </button>
        </div>

        {/* Stats grid — 1 col mobile, 3 cols sm+ */}
        {plans.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Plans créés', value: plans.length, color: 'text-[#8B1A2F]' },
              { label: 'Scénarios prêts', value: plans.filter(p => p.status === 'scenarios_ready').length, color: 'text-green-600' },
              { label: 'Exécutés', value: plans.filter(p => p.status === 'executed').length, color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="assemblage-stat bg-white rounded-xl border border-[#E8E4DE] px-4 py-3">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-[#9B9590]">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-[#E8E4DE] p-5 animate-pulse">
                <div className="h-4 bg-[#E8E4DE] rounded mb-3 w-3/4" />
                <div className="h-3 bg-[#F5F3EF] rounded mb-2" />
                <div className="h-2 bg-[#F5F3EF] rounded w-5/6 mt-4" />
              </div>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreate(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} onClick={() => setSelectedPlan(plan)} />
            ))}
          </div>
        )}

        {selectedPlan && <PlanDetailModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}
        {showCreate && <CreatePlanModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      </div>
    </div>
  );
}
