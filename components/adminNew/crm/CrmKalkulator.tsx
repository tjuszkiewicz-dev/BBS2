'use client';

import React, { useState } from 'react';
import {
  Plus, Trash2, ChevronRight, ChevronLeft, X, Calculator,
  Building2, Users, TrendingDown, TrendingUp, CheckCircle, Save, AlertCircle,
} from 'lucide-react';

interface Employee {
  id:             string;
  imie:           string;
  nettoDocelowe:  number;
  typUmowy:       'UOP' | 'UZ';
  trybSkladek:    'PELNY' | 'STUDENT_UZ' | 'INNY_TYTUL' | 'BEZ_CHOROBOWEJ';
  choroboweAktywne: boolean;
  pit2:           string;
  ulgaMlodych:    boolean;
  kupTyp:         'STANDARD' | 'PODWYZSZONE' | 'PROC_50';
  pitMode:        'AUTO' | 'FLAT_0' | 'FLAT_12' | 'FLAT_32';
  skladkaFP:      boolean;
  skladkaFGSP:    boolean;
}

interface FirmaForm {
  nazwa:          string;
  nip:            string;
  stawkaWyp:      number;
  prowizjaProc:   number;
  nettoZasadProc: number;
}

interface CalcResults {
  wyniki: {
    szczegoly: Array<{
      pracownik:   Employee;
      standard:    { netto: number; brutto: number; kosztPracodawcy: number };
      podzial:     { kosztPracodawcy: number; swiadczenie: { brutto: number; netto: number }; zasadnicza: { brutto: number; netto: number } };
      oszczednosc: number;
    }>;
    podsumowanie: {
      sumaKosztStandard:        number;
      sumaKosztPodzial:         number;
      sumaBruttoSwiadczen:      number;
      oszczednoscBrutto:        number;
      prowizja:                 number;
      oszczednoscNetto:         number;
      oszczednoscRoczna:        number;
      sredniaOszczednoscNaEtat: number;
    };
  };
}

const fmt = (n: number) => n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const newEmployee = (): Employee => ({
  id:              Math.random().toString(36).slice(2),
  imie:            '',
  nettoDocelowe:   5000,
  typUmowy:        'UOP',
  trybSkladek:     'PELNY',
  choroboweAktywne: true,
  pit2:            '300',
  ulgaMlodych:     false,
  kupTyp:          'STANDARD',
  pitMode:         'AUTO',
  skladkaFP:       true,
  skladkaFGSP:     true,
});

const STEPS = [
  { label: 'Firma',       icon: <Building2 size={16} /> },
  { label: 'Pracownicy',  icon: <Users size={16} /> },
  { label: 'Standard',    icon: <TrendingDown size={16} /> },
  { label: 'Ofertowy',    icon: <TrendingUp size={16} /> },
  { label: 'Business Case', icon: <CheckCircle size={16} /> },
];

export const CrmKalkulator: React.FC = () => {
  const [step,     setStep]     = useState(0);
  const [firma,    setFirma]    = useState<FirmaForm>({ nazwa: '', nip: '', stawkaWyp: 1.67, prowizjaProc: 28, nettoZasadProc: 50 });
  const [empList,  setEmpList]  = useState<Employee[]>([newEmployee()]);
  const [results,  setResults]  = useState<CalcResults | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [saved,    setSaved]    = useState(false);

  const updateEmp = (id: string, patch: Partial<Employee>) =>
    setEmpList(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));

  const calculate = async (saveSession = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/kalkulator/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pracownicy:      empList,
          stawkaWypadkowa: firma.stawkaWyp,
          prowizjaProc:    firma.prowizjaProc,
          nettoZasadProc:  firma.nettoZasadProc,
          saveSession,
          companyName:     firma.nazwa,
          nip:             firma.nip,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data);
      if (saveSession) setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd obliczenia');
    } finally {
      setLoading(false);
    }
  };

  const goNext = async () => {
    if (step === 1) {
      await calculate(false);
    }
    setStep(s => Math.min(s + 1, 4));
  };

  const P = results?.wyniki.podsumowanie;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: '#4a95a9' }}
        >
          <Calculator size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Kalkulator Ofertowy</h2>
          <p className="text-xs text-slate-500">Pokaż klientowi ile zaoszczędzi na poodziale wynagrodzenia</p>
        </div>
      </div>

      {/* Step bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <button
              onClick={() => i < step || results ? setStep(i) : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                step === i
                  ? 'text-white shadow-sm'
                  : i < step
                  ? 'text-slate-600 bg-slate-100'
                  : 'text-slate-400 bg-transparent cursor-default'
              }`}
              style={step === i ? { backgroundColor: '#4a95a9' } : {}}
            >
              {s.icon} {s.label}
            </button>
            {i < STEPS.length - 1 && <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ─── STEP 0: FIRMA ──────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-700">Dane firmy klienta</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'nazwa', label: 'Nazwa firmy',     type: 'text' },
              { key: 'nip',   label: 'NIP',             type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={(firma as any)[f.key]}
                  onChange={e => setFirma(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            ))}
            {[
              { key: 'stawkaWyp',      label: 'Stawka wypadkowa (%)', min: 0.1, max: 3.86, step: 0.01 },
              { key: 'prowizjaProc',   label: 'Prowizja BBS (%)',     min: 20,  max: 40,   step: 1    },
              { key: 'nettoZasadProc', label: 'Udział zasadniczej (%)',min: 20, max: 80,   step: 1    },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{f.label}</label>
                <input
                  type="number"
                  min={f.min} max={f.max} step={f.step}
                  value={(firma as any)[f.key]}
                  onChange={e => setFirma(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── STEP 1: PRACOWNICY ────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Lista pracowników ({empList.length})</h3>
            <button
              onClick={() => setEmpList(prev => [...prev, newEmployee()])}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg"
              style={{ backgroundColor: '#4a95a9' }}
            >
              <Plus size={14} /> Dodaj
            </button>
          </div>
          {empList.map((emp, idx) => (
            <div key={emp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pracownik {idx + 1}</p>
                {empList.length > 1 && (
                  <button
                    onClick={() => setEmpList(prev => prev.filter(e => e.id !== emp.id))}
                    className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">Imię/Identyfikator</label>
                  <input
                    type="text"
                    placeholder={`Prac. ${idx + 1}`}
                    value={emp.imie}
                    onChange={e => updateEmp(emp.id, { imie: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Netto docelowe (PLN)</label>
                  <input
                    type="number"
                    min={1000} max={50000} step={100}
                    value={emp.nettoDocelowe}
                    onChange={e => updateEmp(emp.id, { nettoDocelowe: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tryb PIT</label>
                  <select
                    value={emp.pitMode}
                    onChange={e => updateEmp(emp.id, { pitMode: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="AUTO">Auto (12%/32%)</option>
                    <option value="FLAT_0">0% (ulga)</option>
                    <option value="FLAT_12">Stałe 12%</option>
                    <option value="FLAT_32">Stałe 32%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Typ ZUS</label>
                  <select
                    value={emp.trybSkladek}
                    onChange={e => updateEmp(emp.id, { trybSkladek: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="PELNY">Pełny ZUS</option>
                    <option value="STUDENT_UZ">Student / UZ</option>
                    <option value="INNY_TYTUL">Inny tytuł</option>
                    <option value="BEZ_CHOROBOWEJ">Bez chorobowej</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">PIT-2 / zm. kwota (PLN)</label>
                  <input
                    type="number" min={0} max={1000} step={50}
                    value={emp.pit2}
                    onChange={e => updateEmp(emp.id, { pit2: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'ulgaMlodych',     label: 'Ulga dla młodych (do 26 lat)' },
                  { key: 'skladkaFP',       label: 'Składka FP' },
                  { key: 'skladkaFGSP',     label: 'Składka FGŚP' },
                ].map(f => (
                  <label key={f.key} className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(emp as any)[f.key]}
                      onChange={e => updateEmp(emp.id, { [f.key]: e.target.checked } as any)}
                      className="rounded"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── STEP 2: STANDARD ──────────────────────────────────────────────── */}
      {step === 2 && results && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
            <TrendingDown size={16} className="text-slate-500" />
            <h3 className="font-semibold text-slate-700 text-sm">Model Standard — UOP bez podziału</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-semibold">Pracownik</th>
                  <th className="text-right px-4 py-2 font-semibold">Netto</th>
                  <th className="text-right px-4 py-2 font-semibold">Brutto</th>
                  <th className="text-right px-4 py-2 font-semibold">Koszt pracodawcy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.wyniki.szczegoly.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {row.pracownik.imie || `Prac. ${i + 1}`}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{fmt(row.standard.netto)} zł</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{fmt(row.standard.brutto)} zł</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-800">{fmt(row.standard.kosztPracodawcy)} zł</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={3} className="px-4 py-2.5 font-bold text-slate-700">SUMA</td>
                  <td className="px-4 py-2.5 text-right font-bold text-lg text-slate-800">
                    {fmt(results.wyniki.podsumowanie.sumaKosztStandard)} zł
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── STEP 3: PRIME ───────────────────────────────────────────────────── */}
      {step === 3 && results && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-200" style={{ backgroundColor: '#f0fdf4' }}>
              <TrendingUp size={16} style={{ color: '#16a34a' }} />
              <h3 className="font-semibold text-sm" style={{ color: '#16a34a' }}>Model Ofertowy — UOP + UZ split</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase tracking-wider bg-slate-50">
                    <th className="text-left px-4 py-2 font-semibold">Pracownik</th>
                    <th className="text-right px-4 py-2 font-semibold">Zasadnicza brutto</th>
                    <th className="text-right px-4 py-2 font-semibold">Świadczenie brutto</th>
                    <th className="text-right px-4 py-2 font-semibold">Koszt pracodawcy</th>
                    <th className="text-right px-4 py-2 font-semibold text-green-700">Oszczędność</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.wyniki.szczegoly.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {row.pracownik.imie || `Prac. ${i + 1}`}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        {fmt(row.podzial.zasadnicza.brutto)} zł
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">
                        {fmt(row.podzial.swiadczenie.brutto)} zł
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                        {fmt(row.podzial.kosztPracodawcy)} zł
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-green-600">
                        +{fmt(row.oszczednosc)} zł
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-green-200" style={{ backgroundColor: '#f0fdf4' }}>
                    <td colSpan={3} className="px-4 py-2.5 font-bold text-slate-700">SUMA</td>
                    <td className="px-4 py-2.5 text-right font-bold text-lg text-slate-800">
                      {fmt(results.wyniki.podsumowanie.sumaKosztPodzial)} zł
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-lg text-green-600">
                      +{fmt(results.wyniki.podsumowanie.oszczednoscBrutto)} zł
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 4: BUSINESS CASE ───────────────────────────────────────────── */}
      {step === 4 && results && P && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Oszcz. brutto / mies.',  value: fmt(P.oszczednoscBrutto) + ' zł', color: 'bg-green-500' },
              { label: 'Prowizja BBS / mies.',   value: fmt(P.prowizja) + ' zł',          color: 'bg-amber-500' },
              { label: 'Oszcz. netto / mies.',   value: fmt(P.oszczednoscNetto) + ' zł',  color: 'bg-teal-600' },
              { label: 'Oszcz. ROCZNA',          value: fmt(P.oszczednoscRoczna) + ' zł', color: 'bg-blue-600' },
            ].map((kpi, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className={`w-8 h-8 rounded-lg ${kpi.color} flex items-center justify-center mb-2`}>
                  <TrendingUp size={16} className="text-white" />
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{kpi.label}</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Summary table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
            <h3 className="font-bold text-slate-800 mb-4">Zestawienie dla {firma.nazwa || 'klienta'}</h3>
            {[
              { label: 'Suma koszt Standard / mies.',    value: fmt(P.sumaKosztStandard) + ' zł' },
              { label: 'Suma koszt ofertowy / mies.',    value: fmt(P.sumaKosztPodzial)  + ' zł' },
              { label: 'Brutto świadczeń / mies.',       value: fmt(P.sumaBruttoSwiadczen) + ' zł' },
              { label: 'Oszczędność brutto / mies.',     value: fmt(P.oszczednoscBrutto) + ' zł', bold: true, green: true },
              { label: `Prowizja BBS (${firma.prowizjaProc}%) / mies.`, value: '−' + fmt(P.prowizja) + ' zł' },
              { label: 'Oszczędność NETTO / mies.',      value: fmt(P.oszczednoscNetto) + ' zł', bold: true, green: true },
              { label: 'Oszczędność ROCZNA',             value: fmt(P.oszczednoscRoczna) + ' zł', bold: true, big: true, green: true },
              { label: 'Średnia / etat / mies.',         value: fmt(P.sredniaOszczednoscNaEtat) + ' zł' },
            ].map((row, i) => (
              <div key={i} className={`flex justify-between items-center py-1.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                <span className={`text-sm ${row.bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{row.label}</span>
                <span className={`font-bold ${row.big ? 'text-xl' : 'text-sm'} ${row.green ? 'text-green-600' : 'text-slate-800'}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Prowizja slider */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Prowizja BBS: <span className="text-slate-800">{firma.prowizjaProc}%</span>
            </label>
            <input
              type="range" min={20} max={40} step={1}
              value={firma.prowizjaProc}
              onChange={async e => {
                setFirma(prev => ({ ...prev, prowizjaProc: parseInt(e.target.value) }));
                await calculate(false);
              }}
              className="w-full accent-teal-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>20%</span><span>40%</span>
            </div>
          </div>

          {/* Save & Export */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => calculate(true)}
              disabled={loading || saved}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: '#4a95a9' }}
            >
              <Save size={16} />
              {saved ? 'Zapisano ✓' : loading ? 'Zapisuję...' : 'Zapisz kalkulację'}
            </button>
          </div>
        </div>
      )}

      {/* ─── NAVIGATION ──────────────────────────────────────────────────────────────── */}
      <div className="flex justify-between pt-2">
        <button
          onClick={() => setStep(s => Math.max(s - 1, 0))}
          disabled={step === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} /> Wstecz
        </button>

        {step < 4 && (
          <button
            onClick={goNext}
            disabled={loading || (step === 1 && empList.length === 0)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: '#4a95a9' }}
          >
            {loading ? 'Obliczam...' : 'Dalej'} <ChevronRight size={16} />
          </button>
        )}

        {step === 4 && (
          <button
            onClick={() => { setStep(0); setResults(null); setSaved(false); setEmpList([newEmployee()]); setFirma({ nazwa: '', nip: '', stawkaWyp: 1.67, prowizjaProc: 28, nettoZasadProc: 50 }); }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X size={16} /> Nowa kalkulacja
          </button>
        )}
      </div>
    </div>
  );
};
