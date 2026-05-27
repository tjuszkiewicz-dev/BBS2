'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Phone, Mail, RefreshCw, UserCheck, XCircle, X, Building2, Hash, User, FileText, Trash2, StickyNote, Send, FileSpreadsheet, ExternalLink, Download } from 'lucide-react';

const TEAL = '#4a95a9';

type LeadStatus = 'new' | 'qualified' | 'converted' | 'rejected';

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
  { id: 'qualified',  label: 'Zakwalifikowany', color: '#4a95a9', bg: '#f0f9ff' },
  { id: 'converted',  label: 'Pozyskany',       color: '#22c55e', bg: '#f0fdf4' },
  { id: 'rejected',   label: 'Odrzucony',       color: '#ef4444', bg: '#fef2f2' },
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new:       'Nowy',
  qualified: 'Zakwalifikowany',
  converted: 'Pozyskany',
  rejected:  'Odrzucony',
};

// ─── Lead Detail Panel ────────────────────────────────────────────────────────

interface LeadNote {
  id: string;
  content: string;
  author_name: string;
  created_at: string;
}

interface LeadOffer {
  id: string;
  company_name: string;
  employees_count: number;
  provision_pct: number;
  total_savings_monthly: number;
  total_savings_yearly: number;
  net_savings_monthly: number;
  pdf_url: string | null;
  created_at: string;
}

function LeadDetailPanel({
  lead,
  onClose,
  onSaved,
  onDeleted,
}: {
  lead: Lead | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Notes state
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Offers state
  const [offers, setOffers] = useState<LeadOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const fetchNotes = useCallback(async (leadId: string) => {
    const res = await fetch(`/api/crm/leads/${leadId}/notes`);
    if (res.ok) setNotes(await res.json());
  }, []);

  const fetchOffers = useCallback(async (leadId: string) => {
    setLoadingOffers(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/offers`);
      if (res.ok) setOffers(await res.json());
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  useEffect(() => {
    if (lead) {
      setForm({ name: lead.name, nip: lead.nip, contact_person: lead.contact_person, phone: lead.phone, email: lead.email, notes: lead.notes });
      setNotes([]);
      setOffers([]);
      setNoteText('');
      fetchNotes(lead.id);
      fetchOffers(lead.id);
    }
  }, [lead, fetchNotes, fetchOffers]);

  const handleAddNote = async () => {
    if (!lead || !noteText.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText.trim() }),
      });
      if (!res.ok) throw new Error('Błąd zapisu');
      const newNote: LeadNote = await res.json();
      setNotes(prev => [newNote, ...prev]);
      setNoteText('');
    } catch {
      showToast(false, 'Nie udało się dodać notatki');
    } finally {
      setAddingNote(false);
    }
  };

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Błąd');
      }
      showToast(true, 'Zapisano');
      onSaved();
    } catch (e) {
      showToast(false, e instanceof Error ? e.message : 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead || !confirm(`Usunąć lead "${lead.name}"? Tej operacji nie można cofnąć.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Błąd usuwania');
      onDeleted();
      onClose();
    } catch (e) {
      showToast(false, e instanceof Error ? e.message : 'Błąd');
    } finally {
      setDeleting(false);
    }
  };

  const isVisible = lead !== null;

  return (
    <>
      {/* Backdrop */}
      {isVisible && (
        <div className="fixed inset-0 bg-slate-900/20 z-40" onClick={onClose} />
      )}

      {/* Panel */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between flex-shrink-0" style={{ backgroundColor: TEAL }}>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight truncate">{lead?.name ?? ''}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {lead ? STATUS_LABELS[lead.status] : ''} · {lead?.source ?? ''}
            </p>
          </div>
          <button onClick={onClose} className="ml-3 p-1 rounded hover:bg-white/20 transition-colors flex-shrink-0">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {[
            { key: 'name',           label: 'Nazwa firmy',        icon: <Building2 size={14} />, required: true },
            { key: 'nip',            label: 'NIP',                icon: <Hash size={14} /> },
            { key: 'contact_person', label: 'Osoba kontaktowa',   icon: <User size={14} /> },
            { key: 'phone',          label: 'Telefon',            icon: <Phone size={14} /> },
            { key: 'email',          label: 'Email',              icon: <Mail size={14} /> },
          ].map(f => (
            <div key={f.key}>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {f.icon} {f.label}
              </label>
              <input
                value={(form as Record<string, string>)[f.key] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4a95a9]"
              />
            </div>
          ))}

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              <FileText size={14} /> Notatki
            </label>
            <textarea
              value={form.notes ?? ''}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4a95a9] resize-none"
            />
          </div>

          {lead && (
            <p className="text-[10px] text-slate-400">
              Dodano: {new Date(lead.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          )}

          {toast && (
            <div className={`rounded-xl px-3 py-2 text-sm font-medium ${toast.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {toast.msg}
            </div>
          )}

          {/* ── Oferty / Kalkulacje ── */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet size={14} style={{ color: TEAL }} />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Oferty i kalkulacje ({offers.length})
              </span>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {loadingOffers && (
                <p className="text-xs text-slate-400 text-center py-3">Ładowanie…</p>
              )}
              {!loadingOffers && offers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">
                  Brak ofert. Wygeneruj ofertę w Kalkulatorze Ofertowym, używając „Dodaj z leadów".
                </p>
              )}
              {offers.map(o => (
                <div key={o.id} className="bg-white rounded-xl px-3 py-2.5 border border-slate-200 hover:border-[#4a95a9]/40 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {o.company_name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(o.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        {' · '}
                        {new Date(o.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white whitespace-nowrap"
                      style={{ backgroundColor: TEAL }}
                    >
                      {o.employees_count} {o.employees_count === 1 ? 'os.' : 'os.'} · {Number(o.provision_pct).toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    <div className="bg-slate-50 rounded px-2 py-1">
                      <p className="text-[9px] text-slate-500 uppercase">Oszczędność / mies.</p>
                      <p className="text-xs font-bold text-slate-800">
                        {new Intl.NumberFormat('pl-PL').format(Math.round(Number(o.net_savings_monthly)))} zł
                      </p>
                    </div>
                    <div className="rounded px-2 py-1" style={{ backgroundColor: '#dcfce7' }}>
                      <p className="text-[9px] uppercase" style={{ color: '#16a34a' }}>Oszczędność / rok</p>
                      <p className="text-xs font-bold" style={{ color: '#16a34a' }}>
                        {new Intl.NumberFormat('pl-PL').format(Math.round(Number(o.total_savings_yearly)))} zł
                      </p>
                    </div>
                  </div>
                  {o.pdf_url && (
                    <div className="flex gap-1.5">
                      <a
                        href={o.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                      >
                        <ExternalLink size={11} /> Otwórz
                      </a>
                      <a
                        href={o.pdf_url}
                        download
                        className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[11px] font-semibold transition-opacity hover:opacity-90"
                        style={{ backgroundColor: TEAL }}
                      >
                        <Download size={11} /> PDF
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Notatki ── */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote size={14} style={{ color: TEAL }} />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Notatki ({notes.length})</span>
            </div>

            {/* Add note */}
            <div className="flex gap-2 mb-3">
              <textarea
                ref={noteRef}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddNote(); }}
                placeholder="Dodaj notatkę… (Ctrl+Enter aby zapisać)"
                rows={2}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4a95a9] resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !noteText.trim()}
                className="self-end p-2.5 rounded-xl text-white disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: TEAL }}
                title="Dodaj notatkę"
              >
                <Send size={14} />
              </button>
            </div>

            {/* Timeline */}
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {notes.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">Brak notatek</p>
              )}
              {notes.map(note => (
                <div key={note.id} className="bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                  <p className="text-sm text-slate-800 leading-snug whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-semibold" style={{ color: TEAL }}>{note.author_name}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(note.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      {' '}
                      {new Date(note.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-100 space-y-2 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: TEAL }}
          >
            {saving ? 'Zapisuję…' : 'Zapisz zmiany'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || saving}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={14} /> Usuń lead
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCard({
  lead, selected, onQualify, onConvert, onReject, onEdit, onDragStart,
}: {
  lead: Lead;
  selected: boolean;
  onQualify: () => void;
  onConvert: () => void;
  onReject: () => void;
  onEdit: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`bg-white rounded-xl border p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${selected ? 'border-[#4a95a9] shadow-md ring-1 ring-[#4a95a9]/30' : 'border-slate-200'}`}
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

// ─── Add Lead Modal ───────────────────────────────────────────────────────────

function AddLeadModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<Lead>) => Promise<void> }) {
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
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Anuluj</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ backgroundColor: TEAL }}>
              {loading ? 'Zapisuję…' : 'Dodaj lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PipelineKanban() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<LeadStatus | null>(null);

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

  const handleEdit = (lead: Lead) => {
    setSelectedLead(prev => (prev?.id === lead.id ? null : lead));
  };

  const handleDrop = async (targetStatus: LeadStatus) => {
    if (!draggedId || draggedId === null) return;
    const lead = leads.find(l => l.id === draggedId);
    if (!lead || lead.status === targetStatus) { setDraggedId(null); setDragOverCol(null); return; }
    setDraggedId(null);
    setDragOverCol(null);
    await fetch(`/api/crm/leads/${draggedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus }),
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
    <div className="max-w-fit rounded-xl overflow-hidden" style={{ backgroundColor: '#f0f7fa', fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
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
        <div className="flex flex-wrap gap-4">
          {COLUMNS.map(col => {
            const colLeads = getColumn(col.id);
            return (
              <div key={col.id} className="w-60 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: col.color }}>
                    {colLeads.length}
                  </span>
                </div>

                <div
                  className="min-h-48 rounded-xl p-2 space-y-2 transition-colors"
                  style={{
                    backgroundColor: dragOverCol === col.id ? col.color + '18' : col.bg,
                    border: dragOverCol === col.id ? `2px dashed ${col.color}` : `1px solid ${col.color}20`,
                  }}
                  onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={() => handleDrop(col.id)}
                >
                  {colLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      selected={selectedLead?.id === lead.id}
                      onQualify={() => qualify(lead.id)}
                      onConvert={() => convert(lead.id)}
                      onReject={() => reject(lead.id)}
                      onEdit={() => handleEdit(lead)}
                      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDraggedId(lead.id); }}
                    />
                  ))}
                  {colLeads.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400">Brak leadów</div>
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

      <LeadDetailPanel
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onSaved={fetchLeads}
        onDeleted={fetchLeads}
      />
    </div>
  );
}
