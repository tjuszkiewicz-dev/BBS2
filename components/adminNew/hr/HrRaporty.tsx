'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Users, Briefcase, TrendingUp, RefreshCw, AlertCircle, FileDown } from 'lucide-react';

interface Stats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
  byContract: Record<string, number>;
  byCompany: { company_name: string; count: number }[];
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

const TEAL = '#4a95a9';
const NAVY = '#0b1622';
const GOLD = '#f0a500';

const BAR_COLORS = [TEAL, GOLD, '#6366f1', '#f43f5e', '#10b981', '#f97316'];

export const HrRaporty: React.FC = () => {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hr/pracownicy');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Array<{
        status: string; role: string; contract_type: string | null; company_name: string | null;
      }> = await res.json();

      const byRole: Record<string, number>     = {};
      const byContract: Record<string, number> = {};
      const byCompanyMap: Record<string, number> = {};

      for (const row of data) {
        byRole[row.role]                         = (byRole[row.role] ?? 0) + 1;
        const ct = row.contract_type ?? 'brak';
        byContract[ct]                           = (byContract[ct] ?? 0) + 1;
        const cn = row.company_name ?? '—';
        byCompanyMap[cn]                         = (byCompanyMap[cn] ?? 0) + 1;
      }

      const byCompany = Object.entries(byCompanyMap)
        .map(([company_name, count]) => ({ company_name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setStats({
        total:    data.length,
        active:   data.filter(d => d.status === 'active').length,
        inactive: data.filter(d => d.status !== 'active').length,
        byRole,
        byContract,
        byCompany,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Błąd');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const exportCsv = async () => {
    try {
      const res = await fetch('/api/hr/pracownicy');
      const data: Array<Record<string, unknown>> = await res.json();
      const keys = ['id', 'full_name', 'role', 'status', 'company_name', 'department', 'position', 'contract_type', 'hire_date', 'phone_number'];
      const csv = [
        keys.join(';'),
        ...data.map(row => keys.map(k => String(row[k] ?? '')).join(';')),
      ].join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `hr-pracownicy-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch {
      alert('Błąd eksportu');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={28} className="animate-spin text-slate-300" />
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
      <AlertCircle size={14} /> {error}
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Raporty HR</h2>
          <p className="text-xs text-slate-500">Statystyki kartoteki pracowniczej</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStats} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: GOLD }}
          >
            <FileDown size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Wszyscy użytkownicy', value: stats.total,    icon: <Users size={20} />,     bg: NAVY  },
          { label: 'Konta aktywne',       value: stats.active,   icon: <TrendingUp size={20} />, bg: TEAL  },
          { label: 'Konta nieaktywne',    value: stats.inactive, icon: <Briefcase size={20} />,  bg: '#e11d48' },
          { label: 'Typy kontraktów',     value: Object.keys(stats.byContract).filter(k => k !== 'brak').length,
            icon: <BarChart3 size={20} />, bg: GOLD },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-4 text-white shadow-sm" style={{ backgroundColor: k.bg }}>
            <div className="flex items-center justify-between mb-2">
              <span className="opacity-70">{k.icon}</span>
            </div>
            <p className="text-3xl font-bold">{k.value}</p>
            <p className="text-xs opacity-70 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Role breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Rozkład ról</h3>
          <div className="space-y-2.5">
            {Object.entries(stats.byRole)
              .sort((a, b) => b[1] - a[1])
              .map(([role, count], i) => {
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={role}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{ROLE_LABELS[role] ?? role}</span>
                      <span className="text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Contract breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Typy umów</h3>
          <div className="space-y-2.5">
            {Object.entries(stats.byContract)
              .filter(([k]) => k !== 'brak')
              .sort((a, b) => b[1] - a[1])
              .map(([type, count], i) => {
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{CONTRACT_LABELS[type] ?? type}</span>
                      <span className="text-slate-400">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            {stats.byContract['brak'] > 0 && (
              <p className="text-xs text-slate-400 mt-1">{stats.byContract['brak']} użytkowników bez przypisanej umowy</p>
            )}
          </div>
        </div>
      </div>

      {/* Top companies */}
      {stats.byCompany.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Top 10 firm wg liczby pracowników</h3>
          <div className="grid md:grid-cols-2 gap-2">
            {stats.byCompany.map((c, i) => {
              const max = stats.byCompany[0]?.count ?? 1;
              const pct = Math.round((c.count / max) * 100);
              return (
                <div key={c.company_name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-5 text-right">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-700 truncate max-w-[140px]">{c.company_name}</span>
                      <span className="text-slate-400 flex-shrink-0 ml-2">{c.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: TEAL }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
