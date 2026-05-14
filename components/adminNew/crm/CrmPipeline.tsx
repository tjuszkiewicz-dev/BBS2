'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, X, ChevronRight, Phone, Mail, AlertCircle, Loader2 } from 'lucide-react';

interface Lead {
  id:             string;
  name:           string;
  nip?:           string;
  contact_person?: string;
  phone?:         string;
  email?:         string;
  notes?:         string;
  status:         string;
  source?:        string;
  created_at:     string;
}

const STAGES = [
  { key: 'NEW',          label: 'Nowy',         color: '#64748b', bg: '#f1f5f9' },
  { key: 'QUALIFIED',    label: 'Zakwalifik.',   color: '#2563eb', bg: '#eff6ff' },
  { key: 'PROPOSAL',     label: 'Propozycja',    color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'NEGOTIATION',  label: 'Negocjacje',    color: '#d97706', bg: '#fffbeb' },
  { key: 'SIGNED',       label: 'Podpisany',     color: '#16a34a', bg: '#f0fdf4' },
  { key: 'LOST',         label: 'Utracony',      color: '#dc2626', bg: '#fef2f2' },
] as const;

type StageKey = typeof STAGES[number]['key'];

const EMPTY_FORM = { name: '', nip: '', contact_person: '', phone: '', email: '', notes: '', source: '' };

export const CrmPipeline: React.FC = () => {
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [moving,  setMoving]  = useState<string | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/leads');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLeads(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'NEW' }),
      });
      if (!res.ok) throw new Error('Błąd zapisu');
      setShowAdd(false);
      setForm(EMPTY_FORM);
      await fetchLeads();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setSaving(false);
    }
  };

  const moveLead = async (lead: Lead, newStatus: StageKey) => {
    setMoving(lead.id);
    try {
      await fetch(`/api/crm/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));
      if (selected?.id === lead.id) setSelected({ ...selected, status: newStatus });
    } finally {
      setMoving(null);
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Usunąć tego leada?')) return;
    await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
    setLeads(prev => prev.filter(l => l.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const byStatus = (key: string) => leads.filter(l => l.status === key);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Pipeline CRM</h2>
          <p className="text-xs text-slate-500">{leads.length} leadów łącznie</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLeads} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Odśwież">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#f0a500' }}
          >
            <Plus size={16} /> Dodaj leada
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Kanban */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {STAGES.map(stage => (
            <div key={stage.key} className="w-56 flex-shrink-0">
              {/* Column header */}
              <div
                className="flex items-center justify-between px-3 py-2 rounded-t-xl text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: stage.bg, color: stage.color, borderBottom: `2px solid ${stage.color}` }}
              >
                <span>{stage.label}</span>
                <span className="bg-white/70 px-1.5 py-0.5 rounded-full text-[10px]">{byStatus(stage.key).length}</span>
              </div>

              {/* Cards */}
              <div className="bg-slate-50 rounded-b-xl border border-slate-200 border-t-0 min-h-[200px] p-2 space-y-2">
                {loading && byStatus(stage.key).length === 0 && (
                  <div className="flex justify-center py-6">
                    <Loader2 size={16} className="animate-spin text-slate-400" />
                  </div>
                )}
                {byStatus(stage.key).map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => setSelected(lead)}
                    className="bg-white rounded-lg border border-slate-200 p-2.5 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all group"
                  >
                    <p className="text-xs font-semibold text-slate-800 truncate">{lead.name}</p>
                    {lead.nip && <p className="text-[10px] text-slate-400">NIP: {lead.nip}</p>}
                    {lead.contact_person && (
                      <p className="text-[10px] text-slate-500 mt-1 truncate">{lead.contact_person}</p>
                    )}
                    <button
                      className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setSelected(lead); }}
                    >
                      Szczegóły <ChevronRight size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Nowy Lead</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              {[
                { key: 'name',           label: 'Nazwa firmy *',    required: true },
                { key: 'nip',            label: 'NIP',              required: false },
                { key: 'contact_person', label: 'Osoba kontaktowa', required: false },
                { key: 'phone',          label: 'Telefon',          required: false },
                { key: 'email',          label: 'Email',            required: false },
                { key: 'source',         label: 'Źródło',           required: false },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={(form as any)[f.key]}
                    required={f.required}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notatki</label>
                <textarea
                  value={form.notes}
                  rows={2}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                  style={{ backgroundColor: '#f0a500' }}
                >
                  {saving ? 'Zapisuję...' : 'Dodaj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Panel */}
      {selected && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 truncate">{selected.name}</h3>
            <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Info */}
            <div className="space-y-2">
              {selected.nip && (
                <p className="text-sm text-slate-600"><span className="font-medium">NIP:</span> {selected.nip}</p>
              )}
              {selected.contact_person && (
                <p className="text-sm text-slate-600"><span className="font-medium">Kontakt:</span> {selected.contact_person}</p>
              )}
              {selected.phone && (
                <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-sm text-blue-600">
                  <Phone size={13} /> {selected.phone}
                </a>
              )}
              {selected.email && (
                <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm text-blue-600">
                  <Mail size={13} /> {selected.email}
                </a>
              )}
              {selected.source && (
                <p className="text-sm text-slate-600"><span className="font-medium">Źródło:</span> {selected.source}</p>
              )}
              {selected.notes && (
                <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">{selected.notes}</p>
              )}
            </div>

            {/* Stage Change */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Zmień etap</p>
              <div className="grid grid-cols-2 gap-1.5">
                {STAGES.map(s => (
                  <button
                    key={s.key}
                    onClick={() => moveLead(selected, s.key as StageKey)}
                    disabled={moving === selected.id || selected.status === s.key}
                    className="py-1.5 px-2 rounded-lg text-xs font-medium border transition-all disabled:opacity-40"
                    style={
                      selected.status === s.key
                        ? { backgroundColor: s.bg, color: s.color, borderColor: s.color }
                        : { borderColor: '#e2e8f0', color: '#64748b' }
                    }
                  >
                    {moving === selected.id ? '...' : s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100">
            <button
              onClick={() => deleteLead(selected.id)}
              className="w-full py-2 rounded-lg text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Usuń leada
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
