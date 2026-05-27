'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { DashboardBootstrap } from './DashboardBootstrap';
import { DashboardSales } from '@/views/DashboardSales';
import { Sidebar } from '@/components/Sidebar';
import { useStrattonSystem } from '@/context/StrattonContext';
import { Role } from '@/types';
import { PartnerLeaderboardWidget } from '@/components/crm/sales/PartnerLeaderboardWidget';
import Image from 'next/image';
import { Menu, Bell, LogOut } from 'lucide-react';

const CalculatorWizard = dynamic(() => import('@/components/crm/calculator/CalculatorWizard'), { ssr: false });
const PipelineKanban = dynamic(() => import('@/components/crm/pipeline/PipelineKanban'), { ssr: false });
const CrmInvoices = dynamic(() => import('@/components/adminNew/crm/CrmInvoices').then(m => ({ default: m.CrmInvoices })), { ssr: false });
const CrmLeaderboard = dynamic(() => import('@/components/adminNew/crm/CrmLeaderboard').then(m => ({ default: m.CrmLeaderboard })), { ssr: false });
const OrgChartView = dynamic(() => import('@/components/adminNew/org/OrgChartView').then(m => ({ default: m.OrgChartView })), { ssr: false });

const TEAL = '#4a95a9';

function NetworkLayout() {
  const { state, actions } = useStrattonSystem();
  const { commissions, companies, orders, users, notifications } = state;
  const currentUser = state.currentUser;

  const [currentView, setCurrentView] = useState('sales-dashboard');
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  if (!currentUser) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const isCRM = currentView.startsWith('crm-') || currentView === 'org-chart' || currentView === 'sales-platnosci';
  const myCommissions = commissions.filter(c => c.agentId === currentUser.id);
  const myCompanies = companies.filter(c =>
    c.advisorId === currentUser.id || c.managerId === currentUser.id || c.directorId === currentUser.id
  );
  const myOrders = orders.filter(o => myCompanies.some(c => c.id === o.companyId));

  return (
    <div
      className={`flex h-screen overflow-hidden transition-[padding] duration-300 ease-in-out ${isDesktopSidebarOpen ? 'md:pl-72' : 'md:pl-16'}`}
      style={{ backgroundColor: '#f1f5f9' }}
    >
      {/* Sidebar (position: fixed — miejsce rezerwowane przez pl-72/pl-16 powyżej) */}
      <Sidebar
        currentUser={currentUser}
        currentView={currentView}
        onChangeView={setCurrentView}
        isOpen={isMobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onToggleDesktop={() => setDesktopSidebarOpen(v => !v)}
        isDesktopOpen={isDesktopSidebarOpen}
        onSwitchUser={handleLogout}
        isLogout
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative z-10 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-4 md:px-6 h-14 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-xl hover:bg-slate-100"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={20} className="text-slate-600" />
            </button>
            <Image src="/bbs-logo.png" alt="BBS" width={90} height={28} className="object-contain" />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button className="p-2 rounded-xl hover:bg-slate-100 relative">
                <Bell size={18} className="text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: TEAL }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-slate-800 leading-none">{currentUser.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{currentUser.role}</p>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {!isCRM && (
            <div className="p-4 md:p-8 space-y-4">
              {currentUser.role === Role.ADVISOR && <PartnerLeaderboardWidget />}
              <DashboardSales
                currentUser={currentUser}
                commissions={myCommissions}
                companies={myCompanies}
                orders={myOrders}
                allUsers={users}
              />
            </div>
          )}
          {currentView === 'crm-kalkulator'  && <CalculatorWizard />}
          {currentView === 'crm-pipeline'    && <PipelineKanban />}
          {currentView === 'crm-leaderboard' && currentUser.role !== Role.ADVISOR && <CrmLeaderboard />}
          {currentView === 'org-chart'       && currentUser.role !== Role.ADVISOR && <OrgChartView />}
          {currentView === 'sales-platnosci' && <CrmInvoices />}
        </main>
      </div>
    </div>
  );
}

export function NetworkDashboardClient() {
  return (
    <DashboardBootstrap>
      <NetworkLayout />
    </DashboardBootstrap>
  );
}
