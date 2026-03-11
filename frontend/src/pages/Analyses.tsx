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
          <h1 className="text-2xl font-bold text-[#f5e6ea] flex items-center gap-2">
            <FlaskConical size={24} className="text-purple-400" />
            Analyses
          </h1>
          <p className="text-[#c4a0aa] text-sm mt-1">{analyses.length} analyses enregistrées</p>
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

      <div className="card p-0 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-[#2a1520]">
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Date</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Lot</th>
              <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">Alcool %</th>
              <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">AT g/L</th>
              <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">AV g/L</th>
              <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">pH</th>
              <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">SO₂L mg/L</th>
              <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">SO₂T mg/L</th>
              <th className="text-right px-4 py-3 text-xs text-[#c4a0aa]">Sucres g/L</th>
              <th className="text-left px-4 py-3 text-xs text-[#c4a0aa]">Type</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({length: 5}).map((_, i) => (
                <tr key={i} className="table-row"><td colSpan={10} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td></tr>
              ))
            ) : analyses.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-10 text-[#c4a0aa]">
                <FlaskConical size={32} className="mx-auto mb-2 opacity-30" />
                Aucune analyse
              </td></tr>
            ) : analyses.map((a: any) => (
              <tr key={a.id} className="table-row">
                <td className="px-4 py-3 text-sm text-[#f5e6ea]">{new Date(a.analysis_date).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-3"><p className="text-sm text-[#f5e6ea]">{a.lot_number}</p><p className="text-xs text-[#c4a0aa]">{a.lot_name}</p></td>
                <td className="px-4 py-3 text-right text-sm text-[#f5e6ea] font-mono">{a.alcohol_percent ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#f5e6ea] font-mono">{a.total_acidity_gl ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#f5e6ea] font-mono">{a.volatile_acidity_gl ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#f5e6ea] font-mono">{a.ph ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#f5e6ea] font-mono">{a.free_so2_mgl ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#f5e6ea] font-mono">{a.total_so2_mgl ?? '—'}</td>
                <td className="px-4 py-3 text-right text-sm text-[#f5e6ea] font-mono">{a.residual_sugar_gl ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-[#c4a0aa] capitalize">{a.analysis_type}</td>
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
      <label className="label">{label}{unit && ` (${unit})`}</label>
      <input type="number" step="0.001" className="input"
        value={(form as any)[name]}
        onChange={e => setForm({...form, [name]: e.target.value})}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#f5e6ea]">Saisir une analyse</h2>
          <button onClick={onClose} className="btn-ghost text-xs">✕</button>
        </div>
        {error && <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Lot *</label>
              <select className="select" value={form.lot_id} onChange={e => setForm({...form, lot_id: e.target.value})} required>
                <option value="">Sélectionner</option>
                {(lots as any[]).map((l: any) => <option key={l.id} value={l.id}>{l.lot_number} — {l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.analysis_date} onChange={e => setForm({...form, analysis_date: e.target.value})} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="select" value={form.analysis_type} onChange={e => setForm({...form, analysis_type: e.target.value})}>
                <option value="standard">Standard</option>
                <option value="complete">Complète</option>
                <option value="quick">Rapide</option>
                <option value="external_lab">Labo externe</option>
              </select>
            </div>
            <div><label className="label">Laboratoire</label><input className="input" value={form.lab_name} onChange={e => setForm({...form, lab_name: e.target.value})} /></div>
          </div>

          <div className="border-t border-[#2a1520] pt-3">
            <p className="text-xs text-[#c4a0aa] mb-3">Paramètres analytiques</p>
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

          <div><label className="label">Commentaires</label><textarea className="input resize-none h-16" value={form.comments} onChange={e => setForm({...form, comments: e.target.value})} /></div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? '...' : 'Enregistrer'}</button>
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#f5e6ea] flex items-center gap-2">
            <Calculator size={18} className="text-purple-400" />
            Simulateur d'assemblage
          </h2>
          <button onClick={onClose} className="btn-ghost text-xs">✕</button>
        </div>

        <p className="text-sm text-[#c4a0aa] mb-4">Calculer les paramètres analytiques prédits après assemblage (moyenne pondérée par volume)</p>

        <div className="space-y-3">
          {/* Add lots */}
          <div>
            <label className="label">Ajouter un lot</label>
            <select className="select" onChange={e => { if (e.target.value) { addLot(e.target.value); e.target.value = ''; }}}>
              <option value="">Sélectionner un lot...</option>
              {(lots as any[]).map((l: any) => <option key={l.id} value={l.id}>{l.lot_number} — {l.name}</option>)}
            </select>
          </div>

          {selectedLots.map((item, i) => (
            <div key={item.lot_id} className="flex items-center gap-3 bg-[#12090c] border border-[#2a1520] rounded-lg p-3">
              <div className="flex-1">
                <p className="text-sm text-[#f5e6ea]">{getLotName(item.lot_id)}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="input w-28"
                  placeholder="Volume L"
                  value={item.volume_liters || ''}
                  onChange={e => {
                    const updated = [...selectedLots];
                    updated[i].volume_liters = Number(e.target.value);
                    setSelectedLots(updated);
                  }}
                  min={0}
                />
                <span className="text-xs text-[#c4a0aa]">L</span>
              </div>
              <button onClick={() => setSelectedLots(selectedLots.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
            </div>
          ))}

          {selectedLots.length >= 2 && (
            <button onClick={calculate} disabled={loading} className="btn-primary w-full justify-center">
              {loading ? '⏳ Calcul...' : '🧪 Calculer l\'assemblage'}
            </button>
          )}

          {result && (
            <div className="bg-[#12090c] border border-[#2a1520] rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-[#f5e6ea]">
                Résultat prédit — Volume total: {Number(result.total_volume).toLocaleString('fr')} L
              </p>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(result.predicted_analysis).filter(([_, v]) => v !== null).map(([k, v]) => {
                  const labels: Record<string, string> = { alcohol_percent: 'Alcool %', total_acidity_gl: 'AT g/L', volatile_acidity_gl: 'AV g/L', ph: 'pH', free_so2_mgl: 'SO₂L', total_so2_mgl: 'SO₂T', malic_acid_gl: 'Malique', lactic_acid_gl: 'Lactique', color_intensity: 'IC', color_hue: 'Nuance' };
                  return (
                    <div key={k} className="text-center">
                      <p className="text-xs text-[#c4a0aa]">{labels[k] || k}</p>
                      <p className="text-sm font-bold text-[#f5e6ea] font-mono">{Number(v as number).toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-[#c4a0aa]">⚠️ Valeurs calculées par moyenne pondérée. Résultats indicatifs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
