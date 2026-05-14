'use client';

import React from 'react';
import type { Firma } from '@/lib/crm/tax-engine/types';
import { Building2, Search } from 'lucide-react';

interface Props {
  firma: Firma;
  onFirmaChange: (f: Firma) => void;
}

const TEAL = '#4a95a9';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all"
      style={{ '--tw-ring-color': TEAL } as React.CSSProperties}
    />
  );
}

export function Step0Company({ firma, onFirmaChange }: Props) {
  const set = (key: keyof Firma) => (val: string | number) =>
    onFirmaChange({ ...firma, [key]: val });

  const lookupGus = async () => {
    if (!firma.nip) return;
    try {
      const res = await fetch(`/api/companies/gus-lookup?nip=${firma.nip}`);
      if (res.ok) {
        const data = await res.json();
        onFirmaChange({
          ...firma,
          nazwa: data.name ?? firma.nazwa,
          adres: data.street ?? firma.adres,
          kodPocztowy: data.zip ?? firma.kodPocztowy,
          miasto: data.city ?? firma.miasto,
        });
      }
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${TEAL}20` }}>
          <Building2 size={20} style={{ color: TEAL }} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Dane firmy</h2>
          <p className="text-sm text-slate-500">Wprowadź dane klienta lub wyszukaj po NIP</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="NIP">
          <div className="flex gap-2">
            <Input value={firma.nip} onChange={set('nip')} placeholder="0000000000" />
            <button
              onClick={lookupGus}
              title="Pobierz z GUS"
              className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Search size={16} className="text-slate-500" />
            </button>
          </div>
        </Field>

        <Field label="Nazwa firmy *">
          <Input value={firma.nazwa} onChange={set('nazwa')} placeholder="Np. ABC Sp. z o.o." />
        </Field>

        <Field label="Adres">
          <Input value={firma.adres ?? ''} onChange={set('adres')} placeholder="ul. Przykładowa 1" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kod pocztowy">
            <Input value={firma.kodPocztowy ?? ''} onChange={set('kodPocztowy')} placeholder="00-000" />
          </Field>
          <Field label="Miasto">
            <Input value={firma.miasto ?? ''} onChange={set('miasto')} placeholder="Warszawa" />
          </Field>
        </div>

        <Field label="Osoba kontaktowa">
          <Input value={firma.osobaKontaktowa ?? ''} onChange={set('osobaKontaktowa')} placeholder="Jan Kowalski" />
        </Field>

        <Field label="Email kontaktowy">
          <Input value={firma.email ?? ''} onChange={set('email')} placeholder="jan@firma.pl" type="email" />
        </Field>

        <Field label="Telefon">
          <Input value={firma.telefon ?? ''} onChange={set('telefon')} placeholder="+48 000 000 000" />
        </Field>

        <Field label="Okres rozliczeniowy">
          <Input value={firma.okres} onChange={set('okres')} type="month" />
        </Field>

        <Field label="Stawka wypadkowa (%)">
          <input
            type="number"
            step="0.01"
            min="0"
            max="10"
            value={firma.stawkaWypadkowa}
            onChange={e => set('stawkaWypadkowa')(parseFloat(e.target.value) || 1.67)}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 transition-all"
          />
        </Field>
      </div>
    </div>
  );
}
