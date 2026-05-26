'use client';

import React, { useState } from 'react';
import type { GlobalneWyniki, Firma, Pracownik } from '@/lib/crm/tax-engine/types';
import { Download, Save, CheckCircle2 } from 'lucide-react';

const TEAL = '#4a95a9';

function fmt(n: number) {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
}

interface Props {
  firma: Firma;
  pracownicy: Pracownik[];
  wyniki: GlobalneWyniki;
  provisionPct: number;
}

export function Step5Summary({ firma, pracownicy, wyniki, provisionPct }: Props) {
  const { podsumowanie: p } = wyniki;
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/crm/kalkulator/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firma, pracownicy, provisionPct, save: true }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Pracownik', 'Netto docelowe', 'Koszt Standard', 'Koszt Split', 'Oszczędność netto'],
      ...wyniki.szczegoly.map((w, idx) => {
        const prac = pracownicy.find(ep => ep.id === w.pracownikId);
        const name = prac ? `${prac.imie} ${prac.nazwisko}`.trim() || `#${idx + 1}` : `#${idx + 1}`;
        return [name, prac?.nettoDocelowe ?? '', w.standardKosztPracodawcy.toFixed(2), w.splitKosztPracodawcy.toFixed(2), w.oszczednoscNetto.toFixed(2)];
      }),
      [],
      ['RAZEM', '', p.sumaKosztStandard.toFixed(2), p.sumaKosztSplit.toFixed(2), p.oszczednoscNetto.toFixed(2)],
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalkulator_${firma.nip || 'export'}_${firma.okres}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${TEAL}20` }}>
          <CheckCircle2 size={20} style={{ color: TEAL }} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Podsumowanie kalkulacji</h2>
          <p className="text-sm text-slate-500">{firma.nazwa} — {firma.okres} — {pracownicy.length} pracowników</p>
        </div>
      </div>

      {/* Summary table */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Liczba pracowników', value: pracownicy.length.toString() },
          { label: 'Prowizja BBS', value: provisionPct + '%' },
          { label: 'Koszt Standard / mies.', value: fmt(p.sumaKosztStandard) },
          { label: 'Koszt ofertowy / mies.', value: fmt(p.sumaKosztSplit) },
          { label: 'Oszczędność brutto / mies.', value: fmt(p.oszczednoscBrutto) },
          { label: 'Prowizja / mies.', value: fmt(p.prowizja) },
          { label: 'Oszczędność netto / mies.', value: fmt(p.oszczednoscNetto) },
          { label: 'Oszczędność roczna', value: fmt(p.oszczednoscRoczna) },
        ].map(row => (
          <div key={row.label} className="flex justify-between items-center py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-sm text-slate-600">{row.label}</span>
            <span className="font-bold text-slate-800">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-100">
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Download size={16} />
          Eksportuj CSV
        </button>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: TEAL }}
        >
          <Save size={16} />
          {saved ? 'Zapisano!' : saving ? 'Zapisuję…' : 'Zapisz kalkulację'}
        </button>
      </div>
    </div>
  );
}
