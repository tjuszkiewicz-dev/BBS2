'use client';

import React, { useState, useEffect } from 'react';
import { Users, FileText, BarChart3, UserCog } from 'lucide-react';
import { HrPracownicy } from './HrPracownicy';
import { HrUmowy }     from './HrUmowy';
import { HrRaporty }   from './HrRaporty';

type HrTab = 'pracownicy' | 'umowy' | 'raporty';

const TABS: { id: HrTab; label: string; icon: React.ReactNode }[] = [
  { id: 'pracownicy', label: 'Pracownicy',  icon: <Users size={15} /> },
  { id: 'umowy',      label: 'Umowy',       icon: <FileText size={15} /> },
  { id: 'raporty',    label: 'Raporty HR',  icon: <BarChart3 size={15} /> },
];

const TEAL = '#4a95a9';
const NAVY = '#0b1622';

interface Props {
  activeSubTab?: HrTab;
}

export const HrDashboard: React.FC<Props> = ({ activeSubTab }) => {
  const [tab, setTab] = useState<HrTab>(activeSubTab ?? 'pracownicy');

  useEffect(() => {
    if (activeSubTab) setTab(activeSubTab);
  }, [activeSubTab]);

  return (
    <div className="space-y-0">
      {/* Panel HR top bar */}
      <div
        className="rounded-t-2xl px-5 py-3.5 flex items-center gap-3"
        style={{ backgroundColor: NAVY }}
      >
        <UserCog size={18} className="text-white opacity-80" />
        <span className="text-white font-semibold text-sm tracking-wide">Panel HR</span>
        <span className="text-white/30 text-sm">|</span>
        <span className="text-white/50 text-xs">{TABS.find(t => t.id === tab)?.label}</span>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 px-5 flex gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[#4a95a9] text-[#4a95a9]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
            }`}
          >
            <span style={{ color: tab === t.id ? TEAL : undefined }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 p-6 shadow-sm">
        {tab === 'pracownicy' && <HrPracownicy />}
        {tab === 'umowy'      && <HrUmowy />}
        {tab === 'raporty'    && <HrRaporty />}
      </div>
    </div>
  );
};
