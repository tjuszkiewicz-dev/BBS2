'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, Edit2, X, Save, AlertCircle, User,
  Building2, Phone, Briefcase, Calendar, ChevronDown, ChevronUp,
} from 'lucide-react';

interface Pracownik {
  id: string;
  full_name: string | null;
  role: string;
  status: string;
  company_id: string | null;
  company_name: string | null;
  department: string | null;
  position: string | null;
  contract_type: string | null;
  hire_date: string | null;
  phone_number: string | null;
  created_at: string | null;
}

interface PracownikDetail extends Pracownik {
  iban: string | null;
  address_street: string | null;
  address_city: string | null;
  address_zip: string | null;
  pesel: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  pracownik:  'Pracownik',
  pracodawca: 'Pracodawca',
  hr:         'Panel HR',
  partner:    'Partner',
  menedzer:   'Menedżer',
  dyrektor:   'Dyrektor',
  superadmin: 'Administrator',
};

const CONTRACT_LABELS: Record<string, string> = {
  UOP: 'Umowa o Pracę',
  UZ:  'Umowa Zlecenia',
  B2B: 'B2B',
};

const STATUS_COLORS: Record<string, string> = {
  active:     'bg-emerald-100 text-emerald-700',
  inactive:   'bg-red-100 text-red-700',
  anonymized: 'bg-slate-100 text-slate-500',
};

const TEAL = '#4a95a9';
const GOLD = '#f0a500';

export const HrPracownicy: React.FC = () => {
  const [pracownicy, setPracownicy] = useState<Pracownik[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [detail,     setDetail]     = useState<PracownikDetail | null>(null);
  const [detailLoad, setDetailLoad] = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [form,       setForm]       = useState<Partial<PracownikDetail>>({});
  const [saving,     setSaving]     = useState(false);

  const fetchPracownicy = useCallback(async (q?: string, role?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q)    params.set('q', q);
      if (role) params.set('role', role);
      const res = await fetch(`/api/hr/pracownicy?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPracownicy(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd pobierania danych');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPracownicy(); }, [fetchPracownicy]);

  const handleSearch = (q: string) => {
    setSearch(q);
    if (q.length >= 2 || q.length === 0) fetchPracownicy(q, roleFilter);
  };

  const handleRoleFilter = (r: string) => {
    setRoleFilter(r);
    fetchPracownicy(search || undefined, r || undefined);
  };

  const toggleExpand = async (p: Pracownik) => {
    if (expanded === p.id) { setExpanded(null); setDetail(null); setEditing(false); return; }
    setExpanded(p.id);
    setEditing(false);
    setDetailLoad(true);
    try {
      const res = await fetch(`/api/hr/pracownicy/${p.id}`);
      if (!res.ok) throw new Error('Błąd pobierania szczegółów');
      setDetail(await res.json());
    } catch {
      setDetail(null);
    } finally {
      setDetailLoad(false);
    }
  };

  const startEdit = () => {
    if (!detail) return;
    setForm({
      full_name:      detail.full_name ?? '',
      department:     detail.department ?? '',
      position:       detail.position ?? '',
      phone_number:   detail.phone_number ?? '',
      contract_type:  detail.contract_type ?? '',
      hire_date:      detail.hire_date ?? '',
      iban:           detail.iban ?? '',
      address_street: detail.address_street ?? '',
      address_city:   detail.address_city ?? '',
      address_zip:    detail.address_zip ?? '',
      status:         detail.status ?? 'active',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/hr/pracownicy/${detail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Błąd zapisu');
      const updated = await res.json();
      setDetail(updated);
      setEditing(false);
      setPracownicy(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setSaving(false);
    }
  };

  const initials = (name: string | null) =>
    (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Kartoteka pracowników</h2>
          <p className="text-xs text-slate-500">{pracownicy.length} rekordów</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={e => handleRoleFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white text-slate-700"
            style={{ minWidth: 140 }}
          >
            <option value="">Wszystkie role</option>
            {Object.entries(ROLE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Szukaj..."
              className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
            />
          </div>

          <button
            onClick={() => fetchPracownicy(search || undefined, roleFilter || undefined)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pracownik</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Firma / Dział</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kontrakt</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Ładowanie...</td></tr>
            )}
            {!loading && pracownicy.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Brak pracowników</td></tr>
            )}
            {pracownicy.map(p => (
              <React.Fragment key={p.id}>
                <tr
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(p)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: TEAL }}
                      >
                        {initials(p.full_name)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{p.full_name ?? '—'}</p>
                        <p className="text-xs text-slate-400">{ROLE_LABELS[p.role] ?? p.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.company_name && <p className="text-xs font-medium text-slate-700">{p.company_name}</p>}
                    {p.department   && <p className="text-xs text-slate-400">{p.department}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {p.contract_type && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {CONTRACT_LABELS[p.contract_type] ?? p.contract_type}
                      </span>
                    )}
                    {p.hire_date && (
                      <p className="text-xs text-slate-400 mt-0.5">od {new Date(p.hire_date).toLocaleDateString('pl-PL')}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {expanded === p.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </td>
                </tr>

                {/* Expand row */}
                {expanded === p.id && (
                  <tr>
                    <td colSpan={5} className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                      {detailLoad && <p className="text-sm text-slate-400">Ładowanie szczegółów...</p>}
                      {!detailLoad && detail && (
                        <div>
                          {!editing ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <DetailField icon={<User size={13} />}      label="Imię i nazwisko"  value={detail.full_name} />
                              <DetailField icon={<Building2 size={13} />} label="Firma"            value={detail.company_name} />
                              <DetailField icon={<Briefcase size={13} />} label="Stanowisko"       value={detail.position} />
                              <DetailField icon={<Briefcase size={13} />} label="Dział"            value={detail.department} />
                              <DetailField icon={<Phone size={13} />}     label="Telefon"          value={detail.phone_number} />
                              <DetailField icon={<Calendar size={13} />}  label="Data zatrudnienia" value={detail.hire_date ? new Date(detail.hire_date).toLocaleDateString('pl-PL') : null} />
                              <DetailField icon={null}                    label="IBAN"             value={detail.iban} />
                              <DetailField icon={null}                    label="Adres"            value={[detail.address_street, detail.address_zip, detail.address_city].filter(Boolean).join(', ')} />
                              <DetailField icon={null}                    label="Kontrakt"         value={detail.contract_type ? (CONTRACT_LABELS[detail.contract_type] ?? detail.contract_type) : null} />
                              <div className="col-span-2 md:col-span-3 flex justify-end">
                                <button
                                  onClick={startEdit}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                                  style={{ backgroundColor: TEAL }}
                                >
                                  <Edit2 size={13} /> Edytuj
                                </button>
                              </div>
                            </div>
                          ) : (
                            <EditForm
                              form={form}
                              onChange={(k, v) => setForm(prev => ({ ...prev, [k]: v }))}
                              onSave={saveEdit}
                              onCancel={() => setEditing(false)}
                              saving={saving}
                            />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading && <p className="text-center text-slate-400 py-8 text-sm">Ładowanie...</p>}
        {pracownicy.map(p => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm cursor-pointer"
            onClick={() => toggleExpand(p)}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: TEAL }}
              >
                {initials(p.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{p.full_name ?? '—'}</p>
                <p className="text-xs text-slate-400 truncate">{p.company_name} · {ROLE_LABELS[p.role] ?? p.role}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function DetailField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
        {icon} {label}
      </p>
      <p className="text-sm text-slate-700">{value || <span className="text-slate-300">—</span>}</p>
    </div>
  );
}

function EditForm({
  form, onChange, onSave, onCancel, saving,
}: {
  form: Partial<PracownikDetail>;
  onChange: (k: string, v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const fields = [
    { key: 'full_name',      label: 'Imię i nazwisko', type: 'text' },
    { key: 'department',     label: 'Dział',           type: 'text' },
    { key: 'position',       label: 'Stanowisko',      type: 'text' },
    { key: 'phone_number',   label: 'Telefon',         type: 'text' },
    { key: 'hire_date',      label: 'Data zatrudnienia', type: 'date' },
    { key: 'iban',           label: 'IBAN',            type: 'text' },
    { key: 'address_street', label: 'Ulica',           type: 'text' },
    { key: 'address_zip',    label: 'Kod pocztowy',    type: 'text' },
    { key: 'address_city',   label: 'Miasto',          type: 'text' },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{f.label}</label>
            <input
              type={f.type}
              value={(form as Record<string, string>)[f.key] ?? ''}
              onChange={e => onChange(f.key, e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        ))}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Kontrakt</label>
          <select
            value={form.contract_type ?? ''}
            onChange={e => onChange('contract_type', e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="">—</option>
            <option value="UOP">Umowa o Pracę</option>
            <option value="UZ">Umowa Zlecenia</option>
            <option value="B2B">B2B</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Status</label>
          <select
            value={form.status ?? 'active'}
            onChange={e => onChange('status', e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <X size={13} /> Anuluj
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: GOLD }}
        >
          <Save size={13} /> {saving ? 'Zapis...' : 'Zapisz'}
        </button>
      </div>
    </div>
  );
}
