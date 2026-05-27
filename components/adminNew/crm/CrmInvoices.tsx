'use client';

import React, { useEffect, useState } from 'react';
import { FileText, RefreshCcw } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string | null;
  amount_net: number;
  vat_amount: number;
  amount_gross: number;
  provision_pct: number;
  provision_amount: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
  lead?: { id: string; name: string | null } | null;
  issued_by_user?: { id: string; full_name: string | null } | null;
}

const STATUS_LABEL: Record<Invoice['status'], string> = {
  DRAFT: 'Szkic',
  ISSUED: 'Wystawiona',
  PAID: 'Opłacona',
  OVERDUE: 'Przeterminowana',
  CANCELLED: 'Anulowana',
};

const STATUS_COLOR: Record<Invoice['status'], string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ISSUED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-400 line-through',
};

function formatPLN(value: number): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL');
}

export function CrmInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/invoices');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Invoice[] = await res.json();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd pobierania faktur');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalNet = invoices.reduce((s, i) => s + Number(i.amount_net), 0);
  const totalProvision = invoices
    .filter(i => i.status === 'PAID')
    .reduce((s, i) => s + Number(i.provision_amount), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Faktury i płatności</h2>
          <p className="text-sm text-slate-500 mt-1">
            Faktury VAT klientów oraz należne prowizje sprzedawców.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-sm text-slate-600"
        >
          <RefreshCcw size={14} /> Odśwież
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Faktury w okresie</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{invoices.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Suma netto</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatPLN(totalNet)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Należna prowizja (opłacone)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatPLN(totalProvision)}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
          Ładowanie…
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <FileText size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-slate-600 font-medium">Brak faktur</p>
          <p className="text-sm text-slate-400 mt-1">
            Faktury VAT pojawią się tutaj po wystawieniu pierwszej oferty klientowi.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-xs">
              <tr>
                <th className="text-left px-4 py-3">Nr</th>
                <th className="text-left px-4 py-3">Klient</th>
                <th className="text-left px-4 py-3">Sprzedawca</th>
                <th className="text-right px-4 py-3">Netto</th>
                <th className="text-right px-4 py-3">VAT</th>
                <th className="text-right px-4 py-3">Brutto</th>
                <th className="text-right px-4 py-3">Prowizja</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Termin</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-700">{inv.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{inv.lead?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.issued_by_user?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{formatPLN(Number(inv.amount_net))}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatPLN(Number(inv.vat_amount))}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatPLN(Number(inv.amount_gross))}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {formatPLN(Number(inv.provision_amount))}
                    <span className="text-xs text-slate-400 ml-1">({inv.provision_pct}%)</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-xs px-2 py-1 rounded-full ${STATUS_COLOR[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(inv.due_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CrmInvoices;
