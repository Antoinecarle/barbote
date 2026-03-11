import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { FlaskConical, Plus, Calculator } from 'lucide-react';

export default function Analyses() {
  const [showCreate, setShowCreate] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const queryClient = useQueryClient();

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => api<any[]>('/analyses'),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1714] flex items-center gap-2" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            <FlaskConical size={24} className="text-[#8B1A2F]" />
            Analyses
          </h1>
          <p className="text-[#5C5550] text-sm mt-1">{analyses.length} analyses enregistrées</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCalculator(true)} className="btn-secondary">
            <Calculator size={16} /> Simuler assemblage
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Saisir analyse
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E8E4DE] rounded-xl overflow-hidden overflow-x-auto" style={{ boxShadow: '0 1px 3px rgba(26,23,20,0.08), 0 4px 12px rgba(26,23,20,0.05)' }}>
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-[#FDFCFA] border-b border-[#E8E4DE]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#9B9590] uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#9B9590] uppercase tracking-wide">Lot</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#9B9590] uppercase tracking-wide">Alcool %</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#9B9590] uppercase tracking-wide">AT g/L</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#9B9590] uppercase tracking-wide">AV g/L</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#9B9590] uppercase tracking-wide">pH</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#9B9590] uppercase tracking-wide">SO₂L mg/L</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#9B9590] uppercase tracking-wide">SO₂T mg/L</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#9B9590] uppercase tracking-wide">Sucres g/L</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#9B9590] uppercase tracking-wide">Type</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({length: 5}).map((_, i) => (
                <tr key={i} className="border-b border-[#EDE9E3]"><td colSpan={10} className="px-4 py-3"><div className="h-4 w-full bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : analyses.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-10 text-[#9B9590]">
                <FlaskConical size={32} className="mx-auto mb-2 opacity-30" />
                Aucune analyse
              </td></tr>
            ) : analyses.map((a: any) => (
              <tr key={a.id} className="hover:bg-[#F5F3EF] border-b border-[#EDE9E3] last:border-0 transition-colors duration-150">
                <td className="px-4 py-3 text-sm text-[#5C5550]">{new Date(a.analysis_date).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3"><p className="text-sm text-[#1A1714]">{a.lot_number}</p><p className="text-xs text-[#5C5550]">{a.lot_name}</p></td>
                <td className="px-4 py-3 text-right text-sm text-[#5C5550] font-mono">{a.alcohol_percent ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#5C5550] font-mono">{a.total_acidity_gl ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#5C5550] font-mono">{a.volatile_acidity_gl ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#5C5550] font-mono">{a.ph ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#5C5550] font-mono">{a.free_so2_mgl ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#5C5550] font-mono">{a.total_so2_mgl ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#5C5550] font-mono">{a.residual_sugar_gl ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-[#5C5550] capitalize">{a.analysis_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateAnalysisModal onClose={() => setShowCreate(false)} onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['analyses'] });
          setShowCreate(false);
        }} />
      )}

      {showCalculator && <AssemblageCalculator onClose={() => setShowCalculator(false)} />}
    </div>
  );
}

function CreateAnalysisModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: lots = [] } = useQuery({ queryKey: ['lots-active'], queryFn: () => api<any[]>('/lots?status=active') });
  const [form, setForm] = useState({
    lot_id: '', analysis_date: new Date().toISOString().split('T')[0], analysis_type: 'standard',
    lab_name: '', alcohol_percent: '', residual_sugar_gl: '', total_acidity_gl: '',
    volatile_acidity_gl: '', ph: '', free_so2_mgl: '', total_so2_mgl: '',
    malic_acid_gl: '', lactic_acid_gl: '', comments: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/analyses', { method: 'POST', body: JSON.stringify(form) });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally { setLoading(false); }
  };

  const Field = ({ label, name, unit }: { label: string; name: string; unit?: string }) => (
    <div>
      <label className="block text-sm font-medium text-[#5C5550] mb-1">{label}{unit && ` (${unit})`}</label>
      <input type="number" step="0.001" className="w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#1A1714] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F]"
        value={(form as any)[name]}
        onChange={e => setForm({...form, [name]: e.target.value})}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" style={{ boxShadow: '0 8px 24px rgba(26,23,20,0.12)' }}>
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#1A1714]">Saisir une analyse</h2>
          <button onClick={onClose} className="text-[#9B9590] hover:text-[#5C5550] text-xl leading-none transition-colors duration-150">✕</button>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#5C5550] mb-1">Lot *</label>
              <select className="w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#1A1714] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F]" value={form.lot_id} onChange={e => setForm({...form, lot_id: e.target.value})} required>
                <option value="">Sélectionner</option>
                {(lots as any[]).map((l: any) => <option key={l.id} value={l.id}>{l.lot_number} — {l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5C5550] mb-1">Date *</label>
              <input type="date" className="w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#1A1714] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F]" value={form.analysis_date} onChange={e => setForm({...form, analysis_date: e.target.value})} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#5C5550] mb-1">Type</label>
              <select className="w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#1A1714] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F]" value={form.analysis_type} onChange={e => setForm({...form, analysis_type: e.target.value})}>
                <option value="standard">Standard</option>
                <option value="complete">Complète</option>
                <option value="quick">Rapide</option>
                <option value="external_lab">Labo externe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5C5550] mb-1">Laboratoire</label>
              <input className="w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#1A1714] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F]" value={form.lab_name} onChange={e => setForm({...form, lab_name: e.target.value})} />
            </div>
          </div>

          <div className="border-t border-[#E8E4DE] pt-3">
            <p className="text-xs font-medium text-[#5C5550] uppercase tracking-wide mb-3">Paramètres analytiques</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Alcool" name="alcohol_percent" unit="%" />
              <Field label="Acidité totale" name="total_acidity_gl" unit="g/L" />
              <Field label="Acidité volatile" name="volatile_acidity_gl" unit="g/L" />
              <Field label="pH" name="ph" />
              <Field label="SO₂ libre" name="free_so2_mgl" unit="mg/L" />
              <Field label="SO₂ total" name="total_so2_mgl" unit="mg/L" />
              <Field label="Sucres résiduels" name="residual_sugar_gl" unit="g/L" />
              <Field label="Acide malique" name="malic_acid_gl" unit="g/L" />
              <Field label="Acide lactique" name="lactic_acid_gl" unit="g/L" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C5550] mb-1">Commentaires</label>
            <textarea className="w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#1A1714] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F] resize-none h-16" value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5C5550] bg-white border border-[#E8E4DE] rounded-lg shadow-sm hover:bg-[#F5F3EF] transition-colors duration-200">Annuler</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors duration-200 disabled:opacity-60" style={{backgroundColor: '#8B1A2F'}}>{loading ? '...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssemblageCalculator({ onClose }: { onClose: () => void }) {
  const { data: lots = [] } = useQuery({ queryKey: ['lots-active'], queryFn: () => api<any[]>('/lots?status=active') });
  const [selectedLots, setSelectedLots] = useState<Array<{lot_id: string; volume_liters: number}>>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const addLot = (lotId: string) => {
    if (!selectedLots.find(l => l.lot_id === lotId)) {
      setSelectedLots([...selectedLots, { lot_id: lotId, volume_liters: 0 }]);
    }
  };

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await api<any>('/analyses/calculate-assemblage', {
        method: 'POST',
        body: JSON.stringify({ lots: selectedLots.filter(l => l.volume_liters > 0) })
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const getLotName = (id: string) => {
    const lot = (lots as any[]).find((l: any) => l.id === id);
    return lot ? `${lot.lot_number} — ${lot.name}` : id;
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" style={{ boxShadow: '0 8px 24px rgba(26,23,20,0.12)' }}>
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#1A1714] flex items-center gap-2">
            <Calculator size={18} className="text-[#8B1A2F]" />
            Simulateur d'assemblage
          </h2>
          <button onClick={onClose} className="text-[#9B9590] hover:text-[#5C5550] text-xl leading-none transition-colors duration-150">✕</button>
        </div>

        <p className="text-sm text-[#5C5550] mb-4">Calculer les paramètres analytiques prédits après assemblage (moyenne pondérée par volume)</p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#5C5550] mb-1">Ajouter un lot</label>
            <select className="w-full rounded-lg border border-[#E8E4DE] bg-white px-3 py-2 text-sm text-[#1A1714] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F]" onChange={e => { if (e.target.value) { addLot(e.target.value); e.target.value = ''; }}}>
              <option value="">Sélectionner un lot...</option>
              {(lots as any[]).map((l: any) => <option key={l.id} value={l.id}>{l.lot_number} — {l.name}</option>)}
            </select>
          </div>

          {selectedLots.map((item, i) => (
            <div key={item.lot_id} className="flex items-center gap-3 bg-[#F5F3EF] border border-[#E8E4DE] rounded-lg p-3">
              <div className="flex-1">
                <p className="text-sm text-[#1A1714]">{getLotName(item.lot_id)}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-28 rounded-lg border border-[#E8E4DE] bg-white px-2 py-1.5 text-sm text-[#1A1714] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A2F]/20 focus:border-[#8B1A2F]"
                  placeholder="Volume L"
                  value={item.volume_liters || ''}
                  onChange={e => {
                    const updated = [...selectedLots];
                    updated[i].volume_liters = Number(e.target.value);
                    setSelectedLots(updated);
                  }}
                  min={0}
                />
                <span className="text-xs text-[#9B9590]">L</span>
              </div>
              <button onClick={() => setSelectedLots(selectedLots.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 text-sm transition-colors duration-150">✕</button>
            </div>
          ))}

          {selectedLots.length >= 2 && (
            <button onClick={calculate} disabled={loading} className="w-full py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors duration-200 disabled:opacity-60" style={{backgroundColor: '#8B1A2F'}}>
              {loading ? 'Calcul...' : "Calculer l'assemblage"}
            </button>
          )}

          {result && (
            <div className="bg-[#FDF2F4] border border-[#F3C5CE] rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-[#1A1714]">
                Résultat prédit — Volume total: {Number(result.total_volume).toLocaleString('fr')} L
              </p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(result.predicted_analysis).filter(([_, v]) => v !== null).map(([k, v]) => {
                  const labels: Record<string, string> = { alcohol_percent: 'Alcool %', total_acidity_gl: 'AT g/L', volatile_acidity_gl: 'AV g/L', ph: 'pH', free_so2_mgl: 'SO₂L', total_so2_mgl: 'SO₂T', malic_acid_gl: 'Malique', lactic_acid_gl: 'Lactique', color_intensity: 'IC', color_hue: 'Nuance' };
                  return (
                    <div key={k} className="text-center bg-white rounded-lg p-2 border border-[#F3C5CE]">
                      <p className="text-xs text-[#5C5550]">{labels[k] || k}</p>
                      <p className="text-sm font-bold text-[#8B1A2F] font-mono">{Number(v as number).toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-[#5C5550]">Valeurs calculées par moyenne pondérée. Résultats indicatifs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
