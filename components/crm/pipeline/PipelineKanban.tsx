'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Phone, Mail, RefreshCw, UserCheck, XCircle } from 'lucide-react';

const TEAL = '#4a95a9';

type LeadStatus = 'new' | 'processing' | 'qualified' | 'converted' | 'rejected';

interface Lead {
  id: string;
  name: string;
  nip?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  notes?: string;
  status: LeadStatus;
  source: string;
  created_at: string;
}

const COLUMNS: { id: LeadStatus; label: string; color: string; bg: string }[] = [
  { id: 'new',        label: 'Nowy',           color: '#64748b', bg: '#f8fafc' },
  { id: 'processing', label: 'W trakcie',       color: '#f0a500', bg: '#fffbeb' },
  { id: 'qualified',  label: 'Zakwalifikowany', color: '#4a95a9', bg: '#f0f9ff' },
  { id: 'converted',  label: 'Pozyskany',       color: '#22c55e', bg: '#f0fdf4' },
  { id: 'rejected',   label: 'Odrzucony',       color: '#ef4444', bg: '#fef2f2' },
];

function LeadCard({
  lead,
  onQualify,
  onConvert,
  onReject,
  onEdit,
}: {
  lead: Lead;
  onQualify: () => void;
  onConvert: () => void;
  onReject: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-3.5 cursor-pointer hover:shadow-md transition-all"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-slate-800 text-sm leading-tight">{lead.name}</p>
          {lead.nip && <p className="text-xs text-slate-400 mt-0.5">NIP: {lead.nip}</p>}
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 whitespace-nowrap font-medium">{lead.source}</span>
      </div>

      {lead.contact_person && (
        <p className="text-xs text-slate-600 mb-1">
          <span className="text-slate-400">👤 </span>{lead.contact_person}
        </p>
      )}

      <div className="flex gap-3 mt-2">
        {lead.phone && (
          <a href={`tel:${lead.phone}`} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Phone size={12} /> {lead.phone}
          </a>
        )}
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Mail size={12} /> Email
          </a>
        )}
      </div>

      {/* Quick actions */}
      {lead.status !== 'converted' && lead.status !== 'rejected' && (
        <div className="flex gap-1.5 mt-3 pt-3 border-t border-slate-100">
          {lead.status === 'new' && (
            <button
              onClick={e => { e.stopPropagation(); onQualify(); }}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors text-white"
              style={{ backgroundColor: TEAL }}
            >
              Kwalifikuj
            </button>
          )}
          {lead.status === 'qualified' && (
            <button
              onClick={e => { e.stopPropagation(); onConvert(); }}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center justify-center gap-1"
            >
              <UserCheck size={12} /> Pozyskaj
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onReject(); }}
            className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
          >
            <XCircle size={12} />
          </button>
        </div>
      )}

      <p className="text-[10px] text-slate-300 mt-2">
        {new Date(lead.created_at).toLocaleDateString('pl-PL')}
      </p>
    </div>
  );
}

interface AddLeadModalProps {
  onClose: () => void;
  onSave: (data: Partial<Lead>) => Promise<void>;
}

function AddLeadModal({ onClose, onSave }: AddLeadModalProps) {
  const [form, setForm] = useState({ name: '', nip: '', contact_person: '', phone: '', email: '', notes: '', source: 'manual' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nazwa firmy jest wymagana'); return; }
    setLoading(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 text-lg mb-4">Nowy lead</h3>
        {error && <p className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: 'name', label: 'Nazwa firmy *', placeholder: 'ABC Sp. z o.o.' },
            { key: 'nip', label: 'NIP', placeholder: '0000000000' },
            { key: 'contact_person', label: 'Osoba kontaktowa', placeholder: 'Jan Kowalski' },
            { key: 'phone', label: 'Telefon', placeholder: '+48 000 000 000' },
            { key: 'email', label: 'Email', placeholder: 'jan@firma.pl' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{f.label}</label>
              <input
                value={(form as Record<string, string>)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Notatki</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Anuluj
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ backgroundColor: TEAL }}>
              {loading ? 'Zapisuję…' : 'Dodaj lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PipelineKanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/leads');
      if (res.ok) setLeads(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const addLead = async (data: Partial<Lead>) => {
    const res = await fetch('/api/crm/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Błąd');
    }
    await fetchLeads();
  };

  const qualify = async (id: string) => {
    const notes = prompt('Notatki kwalifikacyjne (opcjonalnie):') ?? '';
    await fetch(`/api/crm/leads/${id}/qualify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    await fetchLeads();
  };

  const convert = async (id: string) => {
    if (!confirm('Oznaczyć lead jako pozyskany klient?')) return;
    await fetch(`/api/crm/leads/${id}/convert`, { method: 'POST' });
    await fetchLeads();
  };

  const reject = async (id: string) => {
    if (!confirm('Oznaczyć lead jako odrzucony?')) return;
    await fetch(`/api/crm/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', rejected_at: new Date().toISOString() }),
    });
    await fetchLeads();
  };

  const filtered = leads.filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.nip ?? '').includes(search) ||
    (l.contact_person ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const getColumn = (status: LeadStatus) => filtered.filter(l => l.status === status);

  return (
    <div className="w-full rounded-xl overflow-hidden" style={{ backgroundColor: '#f0f7fa', fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Pipeline CRM</h1>
            <p className="text-xs text-slate-500">{leads.filter(l => l.status !== 'rejected').length} aktywnych leadów</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj lead…"
              className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 w-48"
            />
          </div>
          <button onClick={fetchLeads} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50">
            <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            <Plus size={16} />
            Nowy lead
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="p-4 md:p-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {COLUMNS.map(col => {
            const colLeads = getColumn(col.id);
            return (
              <div key={col.id} className="min-w-0">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: col.color }}>
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div
                  className="min-h-48 rounded-xl p-2 space-y-2"
                  style={{ backgroundColor: col.bg, border: `1px solid ${col.color}20` }}
                >
                  {colLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onQualify={() => qualify(lead.id)}
                      onConvert={() => convert(lead.id)}
                      onReject={() => reject(lead.id)}
                      onEdit={() => {/* future: open detail modal */}}
                    />
                  ))}
                  {colLeads.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400">
                      Brak leadów
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAddModal && (
        <AddLeadModal onClose={() => setShowAddModal(false)} onSave={addLead} />
      )}
    </div>
  );
}
