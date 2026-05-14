'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, RefreshCw, X, Phone, Mail, Building2, User, MapPin,
  Calendar, MessageSquare, FileText, ChevronRight, ChevronDown,
  List, KanbanSquare, AlertTriangle, Clock, CheckCircle2, Circle,
  Trash2, Edit3, Save, Loader2, TrendingUp
} from 'lucide-react';

// ─── Typy ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string;
  nip?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  notes?: string;
  status: string;
  source?: string;
  assigned_to?: string;
  last_activity_at?: string;
  industry?: string;
  company_size?: string;
  contact_position?: string;
  city?: string;
  street?: string;
  postal_code?: string;
  reservation_end_date?: string;
  created_at: string;
  updated_at?: string;
}

interface Activity {
  id: string;
  lead_id: string;
  user_id?: string;
  type: 'CALL' | 'MEETING' | 'EMAIL' | 'NOTE';
  description?: string;
  occurred_at: string;
  is_completed: boolean;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  is_primary?: boolean;
}

type ActiveTab = 'details' | 'contacts' | 'activity' | 'offers';
type ViewMode = 'list' | 'kanban';

// ─── Stałe ───────────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'NEW',               label: 'Nowy',                color: '#64748b', bg: '#f1f5f9' },
  { key: 'IN_TALKS',          label: 'W rozmowach',         color: '#2563eb', bg: '#eff6ff' },
  { key: 'OFFER_PREPARING',   label: 'Przygotowanie oferty', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'OFFER_GENERATED',   label: 'Oferta wygenerowana', color: '#d97706', bg: '#fffbeb' },
  { key: 'CALCULATION_SENT',  label: 'Wysłano ofertę',      color: '#0891b2', bg: '#ecfeff' },
  { key: 'SPECIAL_OFFER',     label: 'Oferta specjalna',    color: '#be185d', bg: '#fdf2f8' },
  { key: 'SIGNED',            label: 'Podpisany',           color: '#16a34a', bg: '#f0fdf4' },
  { key: 'RESIGNED',          label: 'Rezygnacja',          color: '#dc2626', bg: '#fef2f2' },
  { key: 'TERMINATED',        label: 'Umowa rozwiązana',    color: '#78716c', bg: '#fafaf9' },
] as const;

const ACTIVITY_TYPES = [
  { key: 'CALL',    label: 'Rozmowa telefoniczna', icon: Phone },
  { key: 'MEETING', label: 'Spotkanie',            icon: Calendar },
  { key: 'EMAIL',   label: 'E-mail',               icon: Mail },
  { key: 'NOTE',    label: 'Notatka',              icon: MessageSquare },
] as const;

const SLA_DAYS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stageFor(key: string) {
  return STAGES.find(s => s.key === key) ?? STAGES[0];
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getSlaStatus(lead: Lead): 'ok' | 'warning' | 'critical' {
  const activeStatuses = ['NEW', 'IN_TALKS', 'OFFER_PREPARING', 'OFFER_GENERATED', 'CALCULATION_SENT', 'SPECIAL_OFFER'];
  if (!activeStatuses.includes(lead.status)) return 'ok';
  const last = lead.last_activity_at ?? lead.updated_at ?? lead.created_at;
  const diffDays = (Date.now() - new Date(last).getTime()) / 86_400_000;
  if (diffDays > SLA_DAYS) return 'critical';
  if (diffDays > SLA_DAYS - 1) return 'warning';
  return 'ok';
}

function getReservationDays(lead: Lead): number | null {
  if (!lead.reservation_end_date) return null;
  const diff = new Date(lead.reservation_end_date).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86_400_000);
}

// ─── Komponent główny ────────────────────────────────────────────────────────

export const CrmPipeline: React.FC = () => {
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [viewMode,     setViewMode]     = useState<ViewMode>('list');
  const [selected,     setSelected]     = useState<Lead | null>(null);
  const [activeTab,    setActiveTab]    = useState<ActiveTab>('details');
  const [filterText,   setFilterText]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Dodawanie leada
  const [showAdd,   setShowAdd]   = useState(false);
  const [addForm,   setAddForm]   = useState({ name: '', nip: '', contact_person: '', phone: '', email: '', notes: '', source: '' });
  const [addSaving, setAddSaving] = useState(false);

  // Edycja szczegółów
  const [editing,    setEditing]    = useState(false);
  const [editForm,   setEditForm]   = useState<Partial<Lead>>({});
  const [editSaving, setEditSaving] = useState(false);

  // Aktywności
  const [activities,     setActivities]     = useState<Activity[]>([]);
  const [activitiesLoad, setActivitiesLoad] = useState(false);
  const [actForm,        setActForm]        = useState({ type: 'CALL' as Activity['type'], description: '', occurred_at: '' });
  const [actSaving,      setActSaving]      = useState(false);

  // Kontakty
  const [contacts,      setContacts]      = useState<Contact[]>([]);
  const [contactsLoad,  setContactsLoad]  = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm,   setContactForm]   = useState({ first_name: '', last_name: '', email: '', phone: '', position: '', is_primary: false });
  const [contactSaving, setContactSaving] = useState(false);

  // ── Fetch leads ─────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/crm/leads');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLeads(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd ładowania');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // ── Fetch aktywności ─────────────────────────────────────────────────────
  const fetchActivities = useCallback(async (leadId: string) => {
    setActivitiesLoad(true);
    try {
      const res = await fetch(`/api/crm/activities?lead_id=${leadId}`);
      if (!res.ok) throw new Error();
      setActivities(await res.json());
    } catch {
      setActivities([]);
    } finally {
      setActivitiesLoad(false);
    }
  }, []);

  // ── Fetch kontaktów ──────────────────────────────────────────────────────
  const fetchContacts = useCallback(async (leadId: string) => {
    setContactsLoad(true);
    try {
      const res = await fetch(`/api/crm/contacts?company_id=${leadId}`);
      if (!res.ok) throw new Error();
      setContacts(await res.json());
    } catch {
      setContacts([]);
    } finally {
      setContactsLoad(false);
    }
  }, []);

  // ── Wybór leada ──────────────────────────────────────────────────────────
  const selectLead = useCallback((lead: Lead) => {
    setSelected(lead);
    setActiveTab('details');
    setEditing(false);
    setEditForm({});
    fetchActivities(lead.id);
    fetchContacts(lead.id);
  }, [fetchActivities, fetchContacts]);

  // ── Dodanie leada ────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name) return;
    setAddSaving(true);
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, status: 'NEW' }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Błąd'); }
      setShowAdd(false);
      setAddForm({ name: '', nip: '', contact_person: '', phone: '', email: '', notes: '', source: '' });
      await fetchLeads();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setAddSaving(false);
    }
  };

  // ── Zmiana statusu (pipeline move) ──────────────────────────────────────
  const moveStatus = async (lead: Lead, newStatus: string) => {
    try {
      await fetch(`/api/crm/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));
      if (selected?.id === lead.id) setSelected(s => s ? { ...s, status: newStatus } : s);
    } catch { /* silent */ }
  };

  // ── Zapis edycji ─────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!selected) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/crm/leads/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Błąd zapisu');
      const updated = { ...selected, ...editForm };
      setSelected(updated);
      setLeads(prev => prev.map(l => l.id === selected.id ? updated : l));
      setEditing(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setEditSaving(false);
    }
  };

  // ── Usunięcie leada ──────────────────────────────────────────────────────
  const deleteLead = async (id: string) => {
    if (!confirm('Usunąć tego leada?')) return;
    await fetch(`/api/crm/leads/${id}`, { method: 'DELETE' });
    setLeads(prev => prev.filter(l => l.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  // ── Dodanie aktywności ───────────────────────────────────────────────────
  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setActSaving(true);
    try {
      const res = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selected.id,
          type: actForm.type,
          description: actForm.description,
          occurred_at: actForm.occurred_at || new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Błąd');
      setActForm({ type: 'CALL', description: '', occurred_at: '' });
      await fetchActivities(selected.id);
      // Aktualizuj last_activity_at w liście
      setLeads(prev => prev.map(l => l.id === selected.id
        ? { ...l, last_activity_at: new Date().toISOString() } : l));
    } catch { /* silent */ } finally {
      setActSaving(false);
    }
  };

  // ── Usunięcie aktywności ─────────────────────────────────────────────────
  const deleteActivity = async (id: string) => {
    if (!confirm('Usunąć tę aktywność?')) return;
    await fetch(`/api/crm/activities/${id}`, { method: 'DELETE' });
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  // ── Toggle ukończenia aktywności ─────────────────────────────────────────
  const toggleActivity = async (activity: Activity) => {
    await fetch(`/api/crm/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: !activity.is_completed }),
    });
    setActivities(prev => prev.map(a => a.id === activity.id
      ? { ...a, is_completed: !a.is_completed } : a));
  };

  // ── Dodanie kontaktu ─────────────────────────────────────────────────────
  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !contactForm.first_name || !contactForm.last_name) return;
    setContactSaving(true);
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contactForm, company_id: selected.id, company_name: selected.name }),
      });
      if (!res.ok) throw new Error('Błąd');
      setShowAddContact(false);
      setContactForm({ first_name: '', last_name: '', email: '', phone: '', position: '', is_primary: false });
      await fetchContacts(selected.id);
    } catch { /* silent */ } finally {
      setContactSaving(false);
    }
  };

  // ── Filtrowanie ──────────────────────────────────────────────────────────
  const filtered = leads.filter(l => {
    const matchText = !filterText || [l.name, l.nip, l.contact_person, l.city]
      .some(v => v?.toLowerCase().includes(filterText.toLowerCase()));
    const matchStatus = !filterStatus || l.status === filterStatus;
    return matchText && matchStatus;
  });

  // ─── Render: SLA badge ───────────────────────────────────────────────────
  const SlaBadge = ({ lead }: { lead: Lead }) => {
    const sla = getSlaStatus(lead);
    if (sla === 'ok') return null;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
        sla === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
      }`}>
        <AlertTriangle size={10} />
        SLA
      </span>
    );
  };

  // ─── Render: status badge ────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => {
    const s = stageFor(status);
    return (
      <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  // ─── Render: activity icon ───────────────────────────────────────────────
  const activityIcon = (type: Activity['type']) => {
    const icons = { CALL: Phone, MEETING: Calendar, EMAIL: Mail, NOTE: MessageSquare };
    const Icon = icons[type];
    const colors = { CALL: 'text-green-600', MEETING: 'text-blue-600', EMAIL: 'text-purple-600', NOTE: 'text-gray-500' };
    return <Icon size={14} className={colors[type]} />;
  };

  // ─── Render: detail panel tabs ───────────────────────────────────────────
  const renderDetailsTab = () => {
    if (!selected) return null;
    if (editing) {
      return (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            {([
              ['Nazwa firmy', 'name', 'text'],
              ['NIP', 'nip', 'text'],
              ['Osoba kontaktowa', 'contact_person', 'text'],
              ['Stanowisko', 'contact_position', 'text'],
              ['Telefon', 'phone', 'tel'],
              ['Email', 'email', 'email'],
              ['Miasto', 'city', 'text'],
              ['Ulica', 'street', 'text'],
              ['Kod pocztowy', 'postal_code', 'text'],
              ['Źródło', 'source', 'text'],
              ['Branża', 'industry', 'text'],
              ['Wielkość firmy', 'company_size', 'text'],
            ] as [string, keyof Lead, string][]).map(([label, field, type]) => (
              <div key={field} className={field === 'name' || field === 'nip' ? 'col-span-2' : ''}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  type={type}
                  value={(editForm[field] as string) ?? (selected[field] as string) ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Notatki</label>
              <textarea
                rows={3}
                value={(editForm.notes as string) ?? selected.notes ?? ''}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={saveEdit} disabled={editSaving}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700">
              {editSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Zapisz
            </button>
            <button onClick={() => { setEditing(false); setEditForm({}); }}
              className="text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50">
              Anuluj
            </button>
          </div>
        </div>
      );
    }

    const slaStatus = getSlaStatus(selected);
    const reservDays = getReservationDays(selected);

    return (
      <div className="space-y-4 text-sm">
        {/* SLA warning */}
        {slaStatus !== 'ok' && (
          <div className={`flex items-center gap-2 p-2 rounded text-xs ${
            slaStatus === 'critical' ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
            <AlertTriangle size={14} />
            {slaStatus === 'critical' ? 'Brak aktywności powyżej 3 dni!' : 'Zbliża się termin SLA (3 dni)'}
          </div>
        )}

        {/* Rezerwacja */}
        {reservDays !== null && (
          <div className={`flex items-center gap-2 p-2 rounded text-xs ${
            reservDays === 0 ? 'bg-red-50 text-red-700' : reservDays <= 7 ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'
          } border`}>
            <Clock size={14} />
            {reservDays === 0 ? 'Rezerwacja NIP wygasła' : `Rezerwacja NIP: ${reservDays} dni`}
          </div>
        )}

        {/* Status select */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Status pipeline</label>
          <select
            value={selected.status}
            onChange={e => moveStatus(selected, e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
          >
            {STAGES.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Dane firmy */}
        <div className="space-y-2">
          {[
            { icon: Building2, label: 'Firma', value: selected.name },
            { icon: FileText, label: 'NIP', value: selected.nip },
            { icon: User, label: 'Kontakt', value: [selected.contact_person, selected.contact_position].filter(Boolean).join(' · ') },
            { icon: Phone, label: 'Telefon', value: selected.phone },
            { icon: Mail, label: 'Email', value: selected.email },
            { icon: MapPin, label: 'Adres', value: [selected.street, selected.postal_code, selected.city].filter(Boolean).join(', ') },
            { icon: TrendingUp, label: 'Branża', value: [selected.industry, selected.company_size].filter(Boolean).join(' · ') },
            { icon: MessageSquare, label: 'Źródło', value: selected.source },
          ].filter(r => r.value).map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2">
              <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-gray-400 text-xs">{label}: </span>
                <span className="text-gray-800">{value}</span>
              </div>
            </div>
          ))}
          {selected.notes && (
            <div className="pt-1">
              <p className="text-xs text-gray-500 mb-1">Notatki</p>
              <p className="text-gray-700 bg-gray-50 rounded p-2 text-xs whitespace-pre-wrap">{selected.notes}</p>
            </div>
          )}
        </div>

        {/* Daty */}
        <div className="pt-1 space-y-1 text-xs text-gray-400">
          <p>Dodano: {formatDate(selected.created_at)}</p>
          <p>Ostatnia aktywność: {formatDate(selected.last_activity_at ?? selected.updated_at)}</p>
        </div>
      </div>
    );
  };

  const renderContactsTab = () => (
    <div className="space-y-3">
      <button onClick={() => setShowAddContact(true)}
        className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
        <Plus size={12} /> Dodaj kontakt
      </button>

      {showAddContact && (
        <form onSubmit={addContact} className="border border-blue-200 rounded p-3 bg-blue-50 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Imię *" value={contactForm.first_name}
              onChange={e => setContactForm(f => ({ ...f, first_name: e.target.value }))}
              className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" required />
            <input placeholder="Nazwisko *" value={contactForm.last_name}
              onChange={e => setContactForm(f => ({ ...f, last_name: e.target.value }))}
              className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" required />
            <input placeholder="Stanowisko" value={contactForm.position}
              onChange={e => setContactForm(f => ({ ...f, position: e.target.value }))}
              className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            <input placeholder="Telefon" value={contactForm.phone}
              onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
              className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
            <input placeholder="Email" type="email" value={contactForm.email}
              onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
              className="col-span-2 border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={contactForm.is_primary}
              onChange={e => setContactForm(f => ({ ...f, is_primary: e.target.checked }))}
              className="rounded" />
            Osoba decyzyjna
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={contactSaving}
              className="flex items-center gap-1 bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700">
              {contactSaving ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />} Dodaj
            </button>
            <button type="button" onClick={() => setShowAddContact(false)}
              className="text-xs px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50">Anuluj</button>
          </div>
        </form>
      )}

      {contactsLoad ? (
        <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : contacts.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">Brak kontaktów</p>
      ) : (
        <div className="space-y-2">
          {contacts.map(c => (
            <div key={c.id} className="border border-gray-100 rounded p-3 bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {c.first_name} {c.last_name}
                    {c.is_primary && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Decyzyjny</span>
                    )}
                  </p>
                  {c.position && <p className="text-xs text-gray-500">{c.position}</p>}
                  <div className="flex gap-3 mt-1">
                    {c.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{c.phone}</span>}
                    {c.email && <span className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} />{c.email}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderActivityTab = () => (
    <div className="space-y-4">
      {/* Formularz dodania aktywności */}
      <form onSubmit={addActivity} className="border border-gray-200 rounded p-3 bg-gray-50 space-y-2">
        <p className="text-xs font-medium text-gray-600">Zarejestruj aktywność</p>
        <div className="flex gap-2">
          {ACTIVITY_TYPES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActForm(f => ({ ...f, type: key as Activity['type'] }))}
              className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded border transition-colors ${
                actForm.type === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-200 text-gray-600 hover:border-blue-300 bg-white'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
        <textarea
          placeholder="Opis aktywności..."
          value={actForm.description}
          onChange={e => setActForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400 resize-none"
        />
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            value={actForm.occurred_at}
            onChange={e => setActForm(f => ({ ...f, occurred_at: e.target.value }))}
            className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400"
          />
          <button type="submit" disabled={actSaving}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-xs px-3 py-1.5 rounded hover:bg-blue-700 whitespace-nowrap">
            {actSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Dodaj
          </button>
        </div>
      </form>

      {/* Timeline */}
      {activitiesLoad ? (
        <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
      ) : activities.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">Brak aktywności dla tego leada</p>
      ) : (
        <div className="space-y-2">
          {activities.map(act => (
            <div key={act.id} className={`flex gap-3 p-2.5 rounded border ${
              act.is_completed ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-white border-gray-200'
            }`}>
              <div className="mt-0.5 shrink-0">{activityIcon(act.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">
                    {ACTIVITY_TYPES.find(t => t.key === act.type)?.label}
                  </span>
                  <span className="text-xs text-gray-400">{formatDateTime(act.occurred_at)}</span>
                </div>
                {act.description && (
                  <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{act.description}</p>
                )}
              </div>
              <div className="flex items-start gap-1 shrink-0">
                <button onClick={() => toggleActivity(act)} title={act.is_completed ? 'Oznacz jako otwarte' : 'Oznacz jako ukończone'}
                  className="text-gray-400 hover:text-green-600 transition-colors">
                  {act.is_completed ? <CheckCircle2 size={14} className="text-green-500" /> : <Circle size={14} />}
                </button>
                <button onClick={() => deleteActivity(act.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderOffersTab = () => (
    <div className="space-y-3 text-sm text-gray-500">
      <div className="border border-dashed border-gray-200 rounded p-4 text-center">
        <TrendingUp size={24} className="mx-auto text-gray-300 mb-2" />
        <p className="text-xs">Oferty powiązane z tym leadem pojawiają się tu po wygenerowaniu kalkulacji.</p>
      </div>
      <p className="text-xs text-center">
        Przejdź do zakładki{' '}
        <button className="text-blue-600 hover:underline"
          onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'crm-kalkulator' }))}>
          Kalkulator
        </button>{' '}
        aby przygotować ofertę.
      </p>
    </div>
  );

  // ─── Render: widok lista ─────────────────────────────────────────────────

  const renderList = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
            <th className="text-left py-2 px-3 font-medium">Firma</th>
            <th className="text-left py-2 px-3 font-medium">NIP</th>
            <th className="text-left py-2 px-3 font-medium">Kontakt</th>
            <th className="text-left py-2 px-3 font-medium">Status</th>
            <th className="text-left py-2 px-3 font-medium">Ostatnia aktywność</th>
            <th className="py-2 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(lead => {
            const sla = getSlaStatus(lead);
            return (
              <tr
                key={lead.id}
                onClick={() => selectLead(lead)}
                className={`border-b border-gray-50 cursor-pointer hover:bg-blue-50 transition-colors ${
                  selected?.id === lead.id ? 'bg-blue-50' : ''
                }`}
              >
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    {sla !== 'ok' && <AlertTriangle size={12} className={sla === 'critical' ? 'text-red-500' : 'text-yellow-500'} />}
                    <span className="font-medium text-gray-800">{lead.name}</span>
                  </div>
                  {lead.city && <span className="text-xs text-gray-400">{lead.city}</span>}
                </td>
                <td className="py-2.5 px-3 text-gray-500">{lead.nip || '—'}</td>
                <td className="py-2.5 px-3">
                  <span className="text-gray-700">{lead.contact_person || '—'}</span>
                  {lead.phone && <div className="text-xs text-gray-400">{lead.phone}</div>}
                </td>
                <td className="py-2.5 px-3"><StatusBadge status={lead.status} /></td>
                <td className="py-2.5 px-3 text-xs text-gray-400">
                  {formatDate(lead.last_activity_at ?? lead.updated_at)}
                </td>
                <td className="py-2.5 px-3">
                  <button onClick={e => { e.stopPropagation(); deleteLead(lead.id); }}
                    className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">Brak leadów</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ─── Render: widok kanban ────────────────────────────────────────────────

  const renderKanban = () => (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STAGES.map(stage => {
        const stageLeads = filtered.filter(l => l.status === stage.key);
        return (
          <div key={stage.key} className="flex-shrink-0 w-56">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold" style={{ color: stage.color }}>{stage.label}</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{stageLeads.length}</span>
            </div>
            <div className="space-y-2 min-h-12">
              {stageLeads.map(lead => {
                const sla = getSlaStatus(lead);
                return (
                  <div
                    key={lead.id}
                    onClick={() => selectLead(lead)}
                    className={`rounded-lg border p-2.5 cursor-pointer text-xs transition-all hover:shadow-md ${
                      selected?.id === lead.id ? 'ring-2 ring-blue-400' : 'bg-white border-gray-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-medium text-gray-800 leading-tight">{lead.name}</span>
                      {sla !== 'ok' && (
                        <AlertTriangle size={12} className={`shrink-0 mt-0.5 ${sla === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
                      )}
                    </div>
                    {lead.contact_person && (
                      <p className="text-gray-500 mb-1">{lead.contact_person}</p>
                    )}
                    {lead.nip && <p className="text-gray-400">NIP: {lead.nip}</p>}
                    <div className="mt-2 pt-1 border-t border-gray-100 flex gap-1 flex-wrap">
                      {STAGES.filter(s => s.key !== stage.key).slice(0, 2).map(s => (
                        <button
                          key={s.key}
                          onClick={e => { e.stopPropagation(); moveStatus(lead, s.key); }}
                          className="text-gray-400 hover:text-blue-600 text-xs transition-colors flex items-center gap-0.5"
                          title={`Przenieś do: ${s.label}`}
                        >
                          <ChevronRight size={10} />
                          {s.label.substring(0, 10)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ─── Render: detail panel ────────────────────────────────────────────────

  const renderDetailPanel = () => {
    if (!selected) return null;
    return (
      <div className="flex flex-col h-full bg-white border-l border-gray-200">
        {/* Nagłówek panelu */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{selected.name}</h3>
            <StatusBadge status={selected.status} />
          </div>
          <div className="flex items-center gap-1 ml-2">
            {!editing && (
              <button onClick={() => { setEditing(true); setEditForm({}); }}
                className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edytuj">
                <Edit3 size={14} />
              </button>
            )}
            <button onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600 p-1">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Zakładki */}
        <div className="flex border-b border-gray-100 text-xs">
          {([
            ['details',  'Szczegóły'],
            ['contacts', 'Kontakty'],
            ['activity', 'Aktywność'],
            ['offers',   'Oferty'],
          ] as [ActiveTab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
              {tab === 'activity' && activities.length > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-xs">
                  {activities.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Treść zakładki */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'details'  && renderDetailsTab()}
          {activeTab === 'contacts' && renderContactsTab()}
          {activeTab === 'activity' && renderActivityTab()}
          {activeTab === 'offers'   && renderOffersTab()}
        </div>
      </div>
    );
  };

  // ─── Główny render ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={15} /> Nowy lead
        </button>
        <button onClick={fetchLeads}
          className="flex items-center gap-1.5 text-gray-600 text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw size={14} /> Odśwież
        </button>

        <input
          type="text"
          placeholder="Szukaj firmy, NIP, kontaktu..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-600 focus:outline-none focus:border-blue-400"
        >
          <option value="">Wszystkie statusy</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>

        {/* Toggle widoku */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 transition-colors ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List size={14} /> Lista
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 text-sm px-3 py-2 transition-colors ${
              viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <KanbanSquare size={14} /> Kanban
          </button>
        </div>

        {/* Statystyki */}
        <div className="text-xs text-gray-400 ml-auto">
          {filtered.length} leadów
          {filtered.filter(l => getSlaStatus(l) === 'critical').length > 0 && (
            <span className="ml-2 text-red-500 font-medium">
              · {filtered.filter(l => getSlaStatus(l) === 'critical').length} po SLA
            </span>
          )}
        </div>
      </div>

      {/* Główny obszar: lista/kanban + panel szczegółów */}
      <div className={`flex gap-0 flex-1 min-h-0 ${selected ? 'divide-x divide-gray-200' : ''}`}>
        <div className={`flex flex-col flex-1 min-w-0 overflow-auto ${selected ? 'max-w-[60%]' : ''}`}>
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-12 text-red-500">
              <AlertTriangle size={32} className="mb-2" />
              <p className="text-sm">{error}</p>
              <button onClick={fetchLeads} className="mt-2 text-sm text-blue-600 hover:underline">Spróbuj ponownie</button>
            </div>
          ) : viewMode === 'list' ? renderList() : renderKanban()}
        </div>

        {/* Panel szczegółów */}
        {selected && (
          <div className="w-80 xl:w-96 shrink-0 flex flex-col min-h-0 overflow-hidden">
            {renderDetailPanel()}
          </div>
        )}
      </div>

      {/* Modal: Nowy lead */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900">Nowy lead</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {([
                  ['Nazwa firmy *', 'name', 'text', true],
                  ['NIP', 'nip', 'text', false],
                  ['Osoba kontaktowa', 'contact_person', 'text', false],
                  ['Telefon', 'phone', 'tel', false],
                  ['Email', 'email', 'email', false],
                  ['Źródło', 'source', 'text', false],
                ] as [string, keyof typeof addForm, string, boolean][]).map(([label, field, type, req]) => (
                  <div key={field} className={field === 'name' || field === 'nip' ? 'col-span-2' : ''}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input
                      type={type}
                      required={req}
                      value={addForm[field]}
                      onChange={e => setAddForm(f => ({ ...f, [field]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Notatki</label>
                  <textarea rows={2} value={addForm.notes}
                    onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Anuluj
                </button>
                <button type="submit" disabled={addSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {addSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Dodaj lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
