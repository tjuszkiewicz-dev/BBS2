import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AdminPulpit } from '../components/adminNew/AdminPulpit';
import { AdminBazaKlientow } from '../components/adminNew/AdminBazaKlientow';
import { AdminPlatnosci } from '../components/adminNew/AdminPlatnosci';
import { AdminArchiwum } from '../components/adminNew/AdminArchiwum';
import { AdminVouchery } from '../components/adminNew/AdminVouchery';
import { AdminBuyback } from '../components/adminNew/AdminBuyback';
import { AdminUsers } from '../components/adminNew/AdminUsers';
import { CrmKontakty } from '../components/adminNew/crm/CrmKontakty';
import { HrDashboard } from '../components/adminNew/hr/HrDashboard';
import { LayoutDashboard, Users, CreditCard, ShieldCheck, Archive, Ticket, RefreshCw, Lock, UserRound } from 'lucide-react';

const CalculatorWizard = dynamic(() => import('@/components/crm/calculator/CalculatorWizard'), { ssr: false });
const PipelineKanban = dynamic(() => import('@/components/crm/pipeline/PipelineKanban'), { ssr: false });

type AdminTab = 'pulpit' | 'klienci' | 'platnosci' | 'archiwum' | 'vouchery' | 'buyback' | 'uzytkowniczy' | 'crm-pipeline' | 'crm-kalkulator' | 'crm-kontakty' | 'hr-pracownicy' | 'hr-umowy' | 'hr-raporty';

const VIEW_TO_TAB: Record<string, AdminTab> = {
  'admin-pulpit':       'pulpit',
  'admin-klienci':      'klienci',
  'admin-platnosci':    'platnosci',
  'admin-archiwum':     'archiwum',
  'admin-vouchery':     'vouchery',
  'admin-buyback':      'buyback',
  'admin-uzytkowniczy': 'uzytkowniczy',
  'crm-pipeline':       'crm-pipeline',
  'crm-kalkulator':     'crm-kalkulator',
  'crm-kontakty':       'crm-kontakty',
  'hr-pracownicy':      'hr-pracownicy',
  'hr-umowy':           'hr-umowy',
  'hr-raporty':         'hr-raporty',
};

const TAB_TO_VIEW: Record<AdminTab, string> = {
  pulpit:           'admin-pulpit',
  klienci:          'admin-klienci',
  platnosci:        'admin-platnosci',
  archiwum:         'admin-archiwum',
  vouchery:         'admin-vouchery',
  buyback:          'admin-buyback',
  uzytkowniczy:     'admin-uzytkowniczy',
  'crm-pipeline':   'crm-pipeline',
  'crm-kalkulator': 'crm-kalkulator',
  'crm-kontakty':   'crm-kontakty',
  'hr-pracownicy':  'hr-pracownicy',
  'hr-umowy':       'hr-umowy',
  'hr-raporty':     'hr-raporty',
};

interface Props {
  currentView: string;
  onViewChange?: (view: string) => void;
}

export const DashboardAdminNew: React.FC<Props> = ({ currentView, onViewChange }) => {
  const isHrTab = (t: AdminTab) => t === 'hr-pracownicy' || t === 'hr-umowy' || t === 'hr-raporty';
  const [tab, setTab] = useState<AdminTab>(() => VIEW_TO_TAB[currentView] ?? 'pulpit');

  useEffect(() => {
    const mapped = VIEW_TO_TAB[currentView];
    if (mapped) setTab(mapped);
  }, [currentView]);

  const handleTab = (t: AdminTab) => {
    setTab(t);
    onViewChange?.(TAB_TO_VIEW[t]);
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pulpit',    label: 'Pulpit',              icon: <LayoutDashboard size={16} /> },
    { id: 'klienci',   label: 'Baza klientów',       icon: <Users size={16} /> },
    { id: 'platnosci', label: 'Płatności i faktury', icon: <CreditCard size={16} /> },
    { id: 'archiwum',  label: 'Archiwum',            icon: <Archive size={16} /> },
    { id: 'vouchery',  label: 'Vouchery',            icon: <Ticket size={16} /> },
    { id: 'buyback',   label: 'Anulowanie subskrypcji', icon: <RefreshCw size={16} /> },
    { id: 'uzytkowniczy', label: 'Użytkownicy',      icon: <Lock size={16} /> },
  ];

  return (
    <div
      className="-m-4 md:-m-8 min-h-screen"
      style={{ backgroundColor: 'transparent', fontFamily: '"Segoe UI", system-ui, sans-serif' }}
    >
      {/* ── TOP BAR (identyczny styl jak HR) ─────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 flex items-center justify-between" style={{ height: 48 }}>
        <div className="flex items-center gap-3">
          <ShieldCheck size={16} className="text-blue-600" />
          <span className="font-semibold text-gray-800 text-sm">Panel Administracyjny</span>
          <span className="text-gray-300">|</span>
          <span className="text-xs text-gray-500">
            {tabs.find(t => t.id === tab)?.label
              ?? (tab === 'crm-kalkulator'  ? 'Kalkulator Prime™'
              : tab === 'crm-pipeline'      ? 'Pipeline CRM'
              : tab === 'crm-kontakty'      ? 'Kontakty CRM'
              : tab === 'hr-pracownicy'     ? 'Panel HR — Pracownicy'
              : tab === 'hr-umowy'          ? 'Panel HR — Umowy'
              : tab === 'hr-raporty'        ? 'Panel HR — Raporty'
              : '')}
          </span>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────────────────────── */}
      <div className="p-6">
        {tab === 'pulpit'    && <AdminPulpit />}
        {tab === 'klienci'   && <AdminBazaKlientow />}
        {tab === 'platnosci' && <AdminPlatnosci />}
        {tab === 'archiwum'  && <AdminArchiwum />}
        {tab === 'vouchery'  && <AdminVouchery />}
        {tab === 'buyback'   && <AdminBuyback />}
        {tab === 'uzytkowniczy' && <AdminUsers />}
      </div>
      {/* CRM views — full-bleed, no padding wrapper */}
      {tab === 'crm-kalkulator' && (
        <div className="-m-6">
          <CalculatorWizard />
        </div>
      )}
      {tab === 'crm-pipeline' && (
        <div className="-m-6">
          <PipelineKanban />
        </div>
      )}
      {tab === 'crm-kontakty' && (
        <div className="p-6">
          <CrmKontakty />
        </div>
      )}
      {isHrTab(tab) && (
        <div className="p-6">
          <HrDashboard activeSubTab={tab === 'hr-pracownicy' ? 'pracownicy' : tab === 'hr-umowy' ? 'umowy' : 'raporty'} />
        </div>
      )}
    </div>
  );
};
