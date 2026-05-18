'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, Search, AlertCircle, Calendar, Building2 } from 'lucide-react';

interface UmowaRow {
  id: string;
  full_name: string | null;
  company_name: string | null;
  contract_type: string | null;
  hire_date: string | null;
  status: string;
  role: string;
}

const CONTRACT_LABELS: Record<string, { label: string; color: string }> = {
  UOP: { label: 'Umowa o Pracę',    color: 'bg-blue-100 text-blue-700' },
  UZ:  { label: 'Umowa Zlecenia',   color: 'bg-purple-100 text-purple-700' },
  B2B: { label: 'B2B',              color: 'bg-amber-100 text-amber-700' },
};

const TEAL = '#4a95a9';

export const HrUmowy: React.FC = () => {
  const [umowy,       setUmowy]       = useState<UmowaRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('');

  const fetchUmowy = useCallback(async (q?: string, type?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q)    params.set('q', q);
      if (type) params.set('contract_type_filter', type);
      const res = await fetch(`/api/hr/pracownicy?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: UmowaRow[] = await res.json();
      const filtered = type
        ? data.filter(d => d.contract_type === type)
        : data;
      setUmowy(filtered.filter(d => d.contract_type));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUmowy(); }, [fetchUmowy]);

  const stats = {
    uop: umowy.filter(u => u.contract_type === 'UOP').length,
    uz:  umowy.filter(u => u.contract_type === 'UZ').length,
    b2b: umowy.filter(u => u.contract_type === 'B2B').length,
  };

  const filtered = umowy.filter(u => {
    const matchQ    = !search || (u.full_name ?? '').toLowerCase().includes(search.toLowerCase()) || (u.company_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || u.contract_type === typeFilter;
    return matchQ && matchType;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Umowy pracownicze</h2>
          <p className="text-xs text-slate-500">{umowy.length} aktywnych umów</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj..."
              className="pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-44"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none"
          >
            <option value="">Wszystkie typy</option>
            <option value="UOP">Umowa o Pracę</option>
            <option value="UZ">Umowa Zlecenia</option>
            <option value="B2B">B2B</option>
          </select>
          <button
            onClick={() => fetchUmowy(search || undefined, typeFilter || undefined)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Umowy o Pracę',  count: stats.uop, type: 'UOP', color: 'border-blue-200 bg-blue-50'   },
          { label: 'Umowy Zlecenia', count: stats.uz,  type: 'UZ',  color: 'border-purple-200 bg-purple-50' },
          { label: 'B2B',            count: stats.b2b, type: 'B2B', color: 'border-amber-200 bg-amber-50'  },
        ].map(s => (
          <button
            key={s.type}
            onClick={() => setTypeFilter(typeFilter === s.type ? '' : s.type)}
            className={`p-4 rounded-xl border text-left transition-all ${s.color} ${typeFilter === s.type ? 'ring-2' : ''}`}
            style={{ outlineColor: TEAL }}
          >
            <p className="text-2xl font-bold text-slate-800">{s.count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pracownik</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Firma</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Typ umowy</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Zatrudniony od</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Ładowanie...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Brak umów spełniających kryteria</p>
                </td>
              </tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: TEAL }}
                    >
                      {(u.full_name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <p className="font-medium text-slate-800">{u.full_name ?? '—'}</p>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Building2 size={12} /> {u.company_name ?? '—'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.contract_type && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTRACT_LABELS[u.contract_type]?.color ?? 'bg-slate-100 text-slate-600'}`}>
                      {CONTRACT_LABELS[u.contract_type]?.label ?? u.contract_type}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {u.hire_date ? (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar size={12} />
                      {new Date(u.hire_date).toLocaleDateString('pl-PL')}
                    </div>
                  ) : <span className="text-slate-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {u.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
