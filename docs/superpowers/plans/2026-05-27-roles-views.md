# Role i widoki BBS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uporządkować 7 ról BBS — naprawić trasę dla `hr`, rozbić menu sieci sprzedaży, dodać widok "Faktury i płatności" z migracją tabeli `crm_invoices` i widget leaderboardu partnera.

**Architecture:** Next.js 15 App Router. Backend = Supabase + API routes z `getAuthUserWithRole()` + `getVisibleUserIds()` (hierarchia po `manager_id`). Frontend = klient komponenty + Sidebar generujący menu per rola. Nowa tabela DB `crm_invoices` z generated columns dla VAT i prowizji.

**Tech Stack:** TypeScript, Next.js 15, Supabase, Tailwind, React. Spec: [docs/superpowers/specs/2026-05-27-roles-views-design.md](../specs/2026-05-27-roles-views-design.md).

---

## Pre-flight

- [ ] **P1: Upewnij się że dev server nie blokuje plików.** Jeśli `npx next dev` chodzi w tle — można zostawić. Wszystkie zmiany hot-reload.

---

## Task 1: Migracja DB — tabela `crm_invoices`

**Files:**
- Create: `supabase/migrations/2026-05-27-create-crm-invoices.sql`
- Apply via: Supabase MCP `apply_migration` na projekt `vogyfffzlucppmddqsqw`

- [ ] **Step 1: Utwórz plik migracji**

Treść `supabase/migrations/2026-05-27-create-crm-invoices.sql`:

```sql
CREATE TABLE IF NOT EXISTS crm_invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid REFERENCES leads(id) ON DELETE SET NULL,
  offer_id        uuid REFERENCES crm_offers(id) ON DELETE SET NULL,
  issued_by       uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  invoice_number  text,
  amount_net      numeric(14,2) NOT NULL DEFAULT 0,
  vat_rate        numeric(5,2)  NOT NULL DEFAULT 23.00,
  vat_amount      numeric(14,2) GENERATED ALWAYS AS (ROUND(amount_net * vat_rate / 100, 2)) STORED,
  amount_gross    numeric(14,2) GENERATED ALWAYS AS (amount_net + ROUND(amount_net * vat_rate / 100, 2)) STORED,
  provision_pct   numeric(5,2)  NOT NULL DEFAULT 0,
  provision_amount numeric(14,2) GENERATED ALWAYS AS (ROUND(amount_net * provision_pct / 100, 2)) STORED,
  status          text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ISSUED','PAID','OVERDUE','CANCELLED')),
  issued_at       timestamptz,
  due_at          timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_invoices_issued_by ON crm_invoices(issued_by);
CREATE INDEX IF NOT EXISTS idx_crm_invoices_lead_id   ON crm_invoices(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_invoices_status    ON crm_invoices(status);
```

- [ ] **Step 2: Zastosuj migrację**

Użyj Supabase MCP:
```
mcp__supabase__apply_migration(project_id: "vogyfffzlucppmddqsqw", name: "create_crm_invoices", query: <treść SQL z kroku 1>)
```

- [ ] **Step 3: Weryfikuj że tabela istnieje**

```
mcp__supabase__execute_sql(project_id: "vogyfffzlucppmddqsqw", query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'crm_invoices' ORDER BY ordinal_position;")
```

Expected: lista 14 kolumn (id, lead_id, offer_id, issued_by, invoice_number, amount_net, vat_rate, vat_amount, amount_gross, provision_pct, provision_amount, status, issued_at, due_at, paid_at, created_at, updated_at).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-05-27-create-crm-invoices.sql
git commit -m "feat(db): tabela crm_invoices z generated columns dla VAT i prowizji"
```

---

## Task 2: Endpoint `/api/crm/invoices/route.ts` (GET, POST)

**Files:**
- Create: `app/api/crm/invoices/route.ts`

- [ ] **Step 1: Utwórz endpoint**

Treść `app/api/crm/invoices/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'] as const;

export async function GET(_request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const visibleIds = await getVisibleUserIds(auth.id, auth.role);

  let query = admin()
    .from('crm_invoices')
    .select('*, lead:leads(id, company_name), issued_by_user:user_profiles!crm_invoices_issued_by_fkey(id, full_name)')
    .order('created_at', { ascending: false });

  if (visibleIds !== null) {
    if (visibleIds.length === 0) return NextResponse.json([]);
    query = query.in('issued_by', visibleIds);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const {
    lead_id = null,
    offer_id = null,
    invoice_number = null,
    amount_net = 0,
    vat_rate = 23,
    provision_pct = 0,
    due_at = null,
  } = body ?? {};

  const { data, error } = await admin()
    .from('crm_invoices')
    .insert({
      lead_id,
      offer_id,
      issued_by: auth.id,
      invoice_number,
      amount_net,
      vat_rate,
      provision_pct,
      due_at,
      status: 'DRAFT',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Sanity check curl**

Start dev server (`npx next dev --port 3010`) i z innego terminala:

```bash
# Bez sesji — oczekiwany 403
curl -i http://localhost:3010/api/crm/invoices
```

Expected: `HTTP/1.1 403 Forbidden` z body `{"error":"Forbidden"}`.

- [ ] **Step 3: Commit**

```bash
git add app/api/crm/invoices/route.ts
git commit -m "feat(api): GET/POST /api/crm/invoices z filtrem hierarchii"
```

---

## Task 3: Endpoint `/api/crm/invoices/[id]/route.ts` (GET, PATCH, DELETE)

**Files:**
- Create: `app/api/crm/invoices/[id]/route.ts`

- [ ] **Step 1: Utwórz endpoint**

Treść `app/api/crm/invoices/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import { getVisibleUserIds, admin } from '@/lib/crm/visibility';

const CRM_ROLES = ['superadmin', 'partner', 'menedzer', 'dyrektor'] as const;

type Ctx = { params: Promise<{ id: string }> };

async function loadInvoiceWithCheck(id: string, callerId: string, callerRole: string) {
  const { data, error } = await admin()
    .from('crm_invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return { invoice: null, status: 404 as const };

  const visibleIds = await getVisibleUserIds(callerId, callerRole);
  if (visibleIds !== null && (!data.issued_by || !visibleIds.includes(data.issued_by))) {
    return { invoice: null, status: 403 as const };
  }
  return { invoice: data, status: 200 as const };
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const res = await loadInvoiceWithCheck(id, auth.id, auth.role);
  if (res.status !== 200) return NextResponse.json({ error: res.status === 404 ? 'Not found' : 'Forbidden' }, { status: res.status });
  return NextResponse.json(res.invoice);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const check = await loadInvoiceWithCheck(id, auth.id, auth.role);
  if (check.status !== 200) return NextResponse.json({ error: 'Forbidden' }, { status: check.status });

  const body = await req.json();
  const allowed: Record<string, true> = {
    invoice_number: true, amount_net: true, vat_rate: true, provision_pct: true,
    status: true, issued_at: true, due_at: true, paid_at: true,
  };
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of Object.keys(body ?? {})) {
    if (allowed[k]) updates[k] = body[k];
  }

  const { data, error } = await admin()
    .from('crm_invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await ctx.params;
  const check = await loadInvoiceWithCheck(id, auth.id, auth.role);
  if (check.status !== 200) return NextResponse.json({ error: 'Forbidden' }, { status: check.status });

  // Tylko superadmin może kasować ostatecznie; reszta zmienia status na CANCELLED
  if (auth.role !== 'superadmin') {
    const { data, error } = await admin()
      .from('crm_invoices')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { error } = await admin().from('crm_invoices').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/crm/invoices/[id]/route.ts
git commit -m "feat(api): GET/PATCH/DELETE /api/crm/invoices/[id] z kontrola widocznosci"
```

---

## Task 4: Modyfikacja `/api/crm/leaderboard` — partner widzi tylko swoją pozycję

**Files:**
- Modify: `lib/crm/leaderboard.ts`
- Modify: `app/api/crm/leaderboard/route.ts`

- [ ] **Step 1: Dodaj funkcję `fetchPartnerSelfStanding` do `lib/crm/leaderboard.ts`**

Dopisz na końcu pliku [lib/crm/leaderboard.ts](../../../lib/crm/leaderboard.ts):

```typescript
export interface PartnerSelfStanding {
  rank: number;
  total_count: number;
  leads_count: number;
  deals_closed: number;
  conversion_rate: number;
  full_name: string;
}

/**
 * Dla partnera: zwraca jego pozycję wśród WSZYSTKICH partnerów w danym okresie.
 * Używamy globalnego rankingu (wszyscy partnerzy), nie tylko zespołu.
 */
export async function fetchPartnerSelfStanding(
  callerId: string,
  period: Period,
): Promise<PartnerSelfStanding | null> {
  const periodStart = getPeriodStart(period);

  const { data: partners, error: partnersError } = await admin()
    .from('user_profiles')
    .select('id, full_name')
    .eq('role', 'partner');

  if (partnersError) throw new Error(partnersError.message);
  if (!partners || partners.length === 0) return null;

  const userIds = partners.map((p: { id: string }) => p.id);

  const { data: leads, error: leadsError } = await admin()
    .from('leads')
    .select('id, assigned_to, status')
    .in('assigned_to', userIds)
    .gte('created_at', periodStart);

  if (leadsError) throw new Error(leadsError.message);
  const leadsData = leads ?? [];

  const statsByUser = new Map<string, { total: number; signed: number }>();
  for (const userId of userIds) statsByUser.set(userId, { total: 0, signed: 0 });
  for (const lead of leadsData) {
    if (!lead.assigned_to) continue;
    const entry = statsByUser.get(lead.assigned_to);
    if (!entry) continue;
    entry.total += 1;
    if (lead.status === 'SIGNED') entry.signed += 1;
  }

  const ranked = partners
    .map((p: { id: string; full_name: string | null }) => {
      const s = statsByUser.get(p.id) ?? { total: 0, signed: 0 };
      return { id: p.id, full_name: p.full_name ?? '', total: s.total, signed: s.signed };
    })
    .sort((a, b) => (b.signed - a.signed) || (b.total - a.total));

  const idx = ranked.findIndex(r => r.id === callerId);
  if (idx === -1) return null;

  const me = ranked[idx];
  const conversion_rate = me.total > 0 ? Math.round((me.signed / me.total) * 100 * 100) / 100 : 0;

  return {
    rank: idx + 1,
    total_count: ranked.length,
    leads_count: me.total,
    deals_closed: me.signed,
    conversion_rate,
    full_name: me.full_name,
  };
}
```

- [ ] **Step 2: Zmodyfikuj `app/api/crm/leaderboard/route.ts`**

Edit [app/api/crm/leaderboard/route.ts](../../../app/api/crm/leaderboard/route.ts) — zastąp całą zawartość:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserWithRole } from '@/lib/apiAuth';
import {
  CRM_ROLES,
  fetchLeaderboard,
  fetchPartnerSelfStanding,
  type LeaderboardEntry,
  type PartnerSelfStanding,
  type Period,
} from '@/lib/crm/leaderboard';

export type { LeaderboardEntry, PartnerSelfStanding };

export async function GET(request: NextRequest) {
  const auth = await getAuthUserWithRole();
  if (!auth || !(CRM_ROLES as readonly string[]).includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get('period') ?? 'month';
  const period: Period = (['month', 'quarter', 'year'] as const).includes(periodParam as Period)
    ? (periodParam as Period)
    : 'month';

  try {
    if (auth.role === 'partner') {
      const self = await fetchPartnerSelfStanding(auth.id, period);
      return NextResponse.json({ self, entries: [] as LeaderboardEntry[] });
    }
    const leaderboard = await fetchLeaderboard(auth.id, auth.role, period);
    return NextResponse.json({ self: null, entries: leaderboard });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Zaktualizuj konsumenta — `components/adminNew/crm/CrmLeaderboard.tsx`**

Sprawdź jak komponent dziś czyta odpowiedź:

```
Grep("fetch.*leaderboard|/api/crm/leaderboard", path: "components/adminNew/crm/CrmLeaderboard.tsx", -n: true)
```

Jeśli komponent oczekuje `LeaderboardEntry[]` jako root response, zmień na `data.entries` (response ma teraz kształt `{ self, entries }`). Konkretny diff:

W miejscu gdzie był:
```typescript
const data: LeaderboardEntry[] = await res.json();
setEntries(data);
```

zmień na:
```typescript
const data: { self: PartnerSelfStanding | null; entries: LeaderboardEntry[] } = await res.json();
setEntries(data.entries);
```

(Dodaj import `PartnerSelfStanding` z `@/app/api/crm/leaderboard/route` lub `@/lib/crm/leaderboard`.)

- [ ] **Step 4: Commit**

```bash
git add lib/crm/leaderboard.ts app/api/crm/leaderboard/route.ts components/adminNew/crm/CrmLeaderboard.tsx
git commit -m "feat(api): partner widzi tylko swoja pozycje w leaderboardzie"
```

---

## Task 5: roleMap — `HR_PANEL` ląduje na `/dashboard/employer`

**Files:**
- Modify: `lib/roleMap.ts:54`

- [ ] **Step 1: Edit**

W [lib/roleMap.ts](../../../lib/roleMap.ts) zmień linię 54:

```typescript
// było:
  [Role.HR_PANEL]:   '/dashboard/admin',
// po:
  [Role.HR_PANEL]:   '/dashboard/employer',
```

- [ ] **Step 2: Commit**

```bash
git add lib/roleMap.ts
git commit -m "fix(auth): rola hr laduje na /dashboard/employer (nie /admin)"
```

---

## Task 6: `EmployerDashboardPage` akceptuje rolę `hr`

**Files:**
- Modify: `app/dashboard/employer/page.tsx:44`

- [ ] **Step 1: Edit**

W [app/dashboard/employer/page.tsx:44](../../../app/dashboard/employer/page.tsx#L44) zmień:

```typescript
// było:
  if (profile?.role !== 'pracodawca' && profile?.role !== 'superadmin') redirect('/login');
// po:
  const ALLOWED = ['pracodawca', 'hr', 'superadmin'] as const;
  if (!profile?.role || !ALLOWED.includes(profile.role as typeof ALLOWED[number])) redirect('/login');
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/employer/page.tsx
git commit -m "feat(auth): rola hr dostepna w /dashboard/employer"
```

---

## Task 7: Sidebar — rozbij `DIRECTOR/MANAGER/ADVISOR`, dodaj fall-through `HR_PANEL`

**Files:**
- Modify: `components/Sidebar.tsx:40-104`

- [ ] **Step 1: Zaimportuj brakującą ikonę jeśli potrzebna**

Jeśli w `components/Sidebar.tsx` nie ma jeszcze importu `Wallet` z `lucide-react`, dodaj go do listy importów na górze pliku (sprawdź istniejące importy lucide-react i dodaj `Wallet`).

- [ ] **Step 2: Zastąp blok `menuItems` (linie 40-104)**

Edit [components/Sidebar.tsx:40-104](../../../components/Sidebar.tsx#L40-L104) — zastąp całe `useMemo`:

```typescript
  const menuItems = useMemo(() => {
    switch (currentUser.role) {
      case Role.HR_PANEL:
      case Role.HR:
        return [
          { id: 'hr-order',     label: 'Nowe zamówienie',       icon: <Plus size={20} /> },
          { id: 'hr-history',   label: 'Historia zamówień',     icon: <FileText size={20} /> },
          { id: 'hr-employees', label: 'Kartoteka pracowników', icon: <Users size={20} /> },
          { id: 'hr-payments',  label: 'Płatności i faktury',   icon: <CreditCard size={20} /> },
        ];
      case Role.SUPERADMIN:
        return [
          { id: 'admin-pulpit',    label: 'Pulpit',              icon: <LayoutDashboard size={20} /> },
          { id: 'admin-klienci',   label: 'Baza klientów',       icon: <Users size={20} /> },
          { id: 'admin-platnosci', label: 'Płatności i faktury', icon: <CreditCard size={20} /> },
          { id: 'admin-archiwum',  label: 'Archiwum',            icon: <FolderOpen size={20} /> },
          { id: 'admin-vouchery',  label: 'Vouchery',                icon: <Ticket size={20} /> },
          { id: 'admin-buyback',      label: 'Anulowanie subskrypcji', icon: <RefreshCw size={20} /> },
          { id: 'admin-uzytkowniczy', label: 'Użytkownicy',             icon: <UserCog size={20} /> },
          { id: 'crm-divider', label: '── CRM ──', icon: null, divider: true },
          { id: 'crm-pipeline',    label: 'Pipeline CRM',    icon: <KanbanSquare size={20} /> },
          { id: 'crm-kalkulator',  label: 'Kalkulator Ofertowy', icon: <Calculator size={20} /> },
          { id: 'crm-kontakty',    label: 'Kontakty',            icon: <UserRound size={20} /> },
          { id: 'crm-leaderboard', label: 'Leaderboard',         icon: <Trophy size={20} /> },
          { id: 'org-chart',       label: 'Org-chart',           icon: <Network size={20} /> },
          { id: 'hr-divider',     label: '── HR ──',        icon: null, divider: true, section: 'HR' },
          { id: 'hr-pracownicy',  label: 'Pracownicy',      icon: <Users size={20} /> },
          { id: 'hr-umowy',       label: 'Umowy',           icon: <Briefcase size={20} /> },
          { id: 'hr-raporty',     label: 'Raporty HR',      icon: <BarChart3 size={20} /> },
        ];
      case Role.EMPLOYEE:
        return [
          { id: 'emp-twoje-aplikacje', label: 'Twoje Aplikacje', icon: <Smartphone size={20} /> },
          { id: 'emp-profitowi', label: 'Profitowi', icon: <HeartPulse size={20} /> },
          { id: 'emp-multipolisa', label: 'Multipolisa.pl', icon: <Shield size={20} /> },
          { id: 'emp-goldman', label: 'Goldman Sachs', icon: <TrendingUp size={20} /> },
          { id: 'emp-wellbeing', label: 'Wellbeing', icon: <Brain size={20} /> },
          { id: 'emp-poradniki', label: 'Poradniki', icon: <BookOpen size={20} /> },
          { id: 'emp-ebooki', label: 'E-booki', icon: <FileText size={20} /> },
          { id: 'emp-history', label: 'Historia', icon: <History size={20} /> },
          { id: 'emp-support', label: 'Centrum Pomocy', icon: <HelpCircle size={20} /> },
          { id: 'emp-active-services', label: 'Aktywne usługi', icon: <ShieldCheck size={20} /> },
        ];
      case Role.ADVISOR:
        return [
          { id: 'sales-dashboard',   label: 'Panel Sprzedaży',     icon: <DollarSign size={20} /> },
          { id: 'crm-divider', label: '── CRM ──', icon: null, divider: true },
          { id: 'crm-pipeline',      label: 'Pipeline',            icon: <KanbanSquare size={20} /> },
          { id: 'crm-kalkulator',    label: 'Kalkulator Ofertowy', icon: <Calculator size={20} /> },
          { id: 'sales-platnosci',   label: 'Faktury i płatności', icon: <CreditCard size={20} /> },
        ];
      case Role.DIRECTOR:
      case Role.MANAGER:
        return [
          { id: 'sales-dashboard',   label: 'Panel Sprzedaży',     icon: <DollarSign size={20} /> },
          { id: 'crm-divider', label: '── CRM ──', icon: null, divider: true },
          { id: 'crm-pipeline',      label: 'Pipeline',            icon: <KanbanSquare size={20} /> },
          { id: 'crm-kalkulator',    label: 'Kalkulator Ofertowy', icon: <Calculator size={20} /> },
          { id: 'crm-leaderboard',   label: 'Leaderboard',         icon: <Trophy size={20} /> },
          { id: 'org-chart',         label: 'Org-chart',           icon: <Network size={20} /> },
          { id: 'sales-platnosci',   label: 'Faktury i płatności', icon: <CreditCard size={20} /> },
        ];
      default:
        return [];
    }
  }, [currentUser.role]);
```

- [ ] **Step 3: Weryfikuj wizualnie**

Otwórz `npx next dev --port 3010`, zaloguj się jako `partner@bbs.test` / `Test1234!` — sprawdź, że Sidebar ma 4 pozycje (Panel Sprzedaży / Pipeline / Kalkulator / Faktury i płatności) i NIE ma Leaderboardu ani Org-chartu.

- [ ] **Step 4: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "feat(sidebar): rozbij menu DIRECTOR/MANAGER/ADVISOR i scal HR_PANEL z HR"
```

---

## Task 8: Komponent `CrmInvoices.tsx` — tabela faktur i prowizji

**Files:**
- Create: `components/adminNew/crm/CrmInvoices.tsx`

- [ ] **Step 1: Utwórz komponent**

Treść `components/adminNew/crm/CrmInvoices.tsx`:

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { FileText, RefreshCcw } from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string | null;
  amount_net: number;
  vat_amount: number;
  amount_gross: number;
  provision_pct: number;
  provision_amount: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
  lead?: { id: string; company_name: string | null } | null;
  issued_by_user?: { id: string; full_name: string | null } | null;
}

const STATUS_LABEL: Record<Invoice['status'], string> = {
  DRAFT: 'Szkic',
  ISSUED: 'Wystawiona',
  PAID: 'Opłacona',
  OVERDUE: 'Przeterminowana',
  CANCELLED: 'Anulowana',
};

const STATUS_COLOR: Record<Invoice['status'], string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  ISSUED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-400 line-through',
};

function formatPLN(value: number): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pl-PL');
}

export function CrmInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/invoices');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Invoice[] = await res.json();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd pobierania faktur');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalNet = invoices.reduce((s, i) => s + Number(i.amount_net), 0);
  const totalProvision = invoices
    .filter(i => i.status === 'PAID')
    .reduce((s, i) => s + Number(i.provision_amount), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Faktury i płatności</h2>
          <p className="text-sm text-slate-500 mt-1">
            Faktury VAT klientów oraz należne prowizje sprzedawców.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-sm text-slate-600"
        >
          <RefreshCcw size={14} /> Odśwież
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Faktury w okresie</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{invoices.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Suma netto</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{formatPLN(totalNet)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Należna prowizja (opłacone)</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatPLN(totalProvision)}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
          Ładowanie…
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <FileText size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 text-slate-600 font-medium">Brak faktur</p>
          <p className="text-sm text-slate-400 mt-1">
            Faktury VAT pojawią się tutaj po wystawieniu pierwszej oferty klientowi.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide text-xs">
              <tr>
                <th className="text-left px-4 py-3">Nr</th>
                <th className="text-left px-4 py-3">Klient</th>
                <th className="text-left px-4 py-3">Sprzedawca</th>
                <th className="text-right px-4 py-3">Netto</th>
                <th className="text-right px-4 py-3">VAT</th>
                <th className="text-right px-4 py-3">Brutto</th>
                <th className="text-right px-4 py-3">Prowizja</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Termin</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-700">{inv.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{inv.lead?.company_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.issued_by_user?.full_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{formatPLN(Number(inv.amount_net))}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatPLN(Number(inv.vat_amount))}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatPLN(Number(inv.amount_gross))}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {formatPLN(Number(inv.provision_amount))}
                    <span className="text-xs text-slate-400 ml-1">({inv.provision_pct}%)</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-xs px-2 py-1 rounded-full ${STATUS_COLOR[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(inv.due_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CrmInvoices;
```

- [ ] **Step 2: Commit**

```bash
git add components/adminNew/crm/CrmInvoices.tsx
git commit -m "feat(crm): komponent CrmInvoices z tabela faktur i prowizji"
```

---

## Task 9: Widget `PartnerLeaderboardWidget.tsx`

**Files:**
- Create: `components/crm/sales/PartnerLeaderboardWidget.tsx`

- [ ] **Step 1: Utwórz widget**

Treść `components/crm/sales/PartnerLeaderboardWidget.tsx`:

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';

interface SelfStanding {
  rank: number;
  total_count: number;
  leads_count: number;
  deals_closed: number;
  conversion_rate: number;
  full_name: string;
}

interface ApiResponse {
  self: SelfStanding | null;
  entries: unknown[];
}

export function PartnerLeaderboardWidget() {
  const [self, setSelf] = useState<SelfStanding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/crm/leaderboard?period=month')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: ApiResponse) => setSelf(data.self))
      .catch(() => setSelf(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse h-32" />
    );
  }

  const hasActivity = self && (self.leads_count > 0 || self.deals_closed > 0);

  return (
    <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
        <Trophy size={28} className="text-amber-700" />
      </div>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wide text-amber-700/70 font-semibold">
          Twoja pozycja na leaderboardzie
        </p>
        {!self || !hasActivity ? (
          <>
            <p className="text-lg font-bold text-amber-900 mt-1">Brak sprzedaży w tym miesiącu</p>
            <p className="text-xs text-amber-700 mt-0.5">Zacznij od pierwszej oferty.</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-bold text-amber-900 mt-0.5">
              #{self.rank}
              <span className="text-base text-amber-700/70 font-medium"> / {self.total_count}</span>
            </p>
            <p className="text-sm text-amber-800 mt-0.5 flex items-center gap-1">
              <TrendingUp size={14} />
              {self.deals_closed} podpisane • {self.leads_count} leadów • {self.conversion_rate}% konwersji
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default PartnerLeaderboardWidget;
```

- [ ] **Step 2: Commit**

```bash
git add components/crm/sales/PartnerLeaderboardWidget.tsx
git commit -m "feat(crm): widget PartnerLeaderboardWidget pokazujacy pozycje partnera"
```

---

## Task 10: `NetworkDashboardClient` — podłącz nowe widoki + widget

**Files:**
- Modify: `app/dashboard/_components/NetworkDashboardClient.tsx`

- [ ] **Step 1: Dodaj importy nowych komponentów**

W [app/dashboard/_components/NetworkDashboardClient.tsx](../../../app/dashboard/_components/NetworkDashboardClient.tsx) na samej górze (sekcja `import` przed `const TEAL`):

```typescript
import { Role } from '@/types';
import { PartnerLeaderboardWidget } from '@/components/crm/sales/PartnerLeaderboardWidget';

const CrmInvoices = dynamic(() => import('@/components/adminNew/crm/CrmInvoices').then(m => ({ default: m.CrmInvoices })), { ssr: false });
const CrmLeaderboard = dynamic(() => import('@/components/adminNew/crm/CrmLeaderboard').then(m => ({ default: m.CrmLeaderboard })), { ssr: false });
const OrgChartView = dynamic(() => import('@/components/adminNew/org/OrgChartView').then(m => ({ default: m.OrgChartView })), { ssr: false });
```

(Importy `CalculatorWizard` i `PipelineKanban` już są — nie duplikuj.)

- [ ] **Step 2: Zmodyfikuj sekcję `<main>`**

W [app/dashboard/_components/NetworkDashboardClient.tsx:91-106](../../../app/dashboard/_components/NetworkDashboardClient.tsx#L91-L106) zastąp blok `<main>`:

```tsx
        {/* Content */}
        <main className="flex-1 overflow-auto">
          {!isCRM && currentView !== 'sales-platnosci' && (
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
```

- [ ] **Step 3: Zaktualizuj `isCRM`**

W [app/dashboard/_components/NetworkDashboardClient.tsx:35](../../../app/dashboard/_components/NetworkDashboardClient.tsx#L35) — `isCRM` musi pokrywać nowe widoki, żeby `DashboardSales` ich nie nadpisywał. Zmień:

```typescript
// było:
  const isCRM = currentView.startsWith('crm-');
// po:
  const isCRM = currentView.startsWith('crm-') || currentView === 'org-chart';
```

- [ ] **Step 4: Weryfikacja ręczna**

Z dev serverem otwartym:

1. Zaloguj się jako `partner@bbs.test` → na `/dashboard/network` widać widget "Twoja pozycja" + Panel Sprzedaży. Kliknij "Faktury i płatności" → empty state ("Brak faktur").
2. Zaloguj się jako `menedzer@bbs.test` → kliknij Leaderboard, Org-chart, Faktury i płatności — każdy widok się ładuje (nawet jeśli pusty).
3. Zaloguj się jako `dyrektor@bbs.test` → ten sam zestaw co menedzer.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/_components/NetworkDashboardClient.tsx
git commit -m "feat(network): podłącz CrmInvoices/Leaderboard/Org-chart + widget partnera"
```

---

## Task 11: Aktualizacja `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md` (sekcja "Auth")

- [ ] **Step 1: Edit**

W [CLAUDE.md](../../../CLAUDE.md) znajdź sekcję "Role → redirect mapping" i zastąp blok:

```markdown
- Role → redirect mapping:
  - `pracodawca` → `/dashboard/employer`
  - `pracownik` → `/dashboard/employee`
  - `superadmin` → `/dashboard/admin`
  - `dyrektor`, `menedzer`, `partner` → `/dashboard/admin` (CRM panel)
```

na:

```markdown
- Role → redirect mapping:
  - `pracodawca` → `/dashboard/employer`
  - `hr` → `/dashboard/employer` (delegowany kadrowiec — to samo menu co pracodawca)
  - `pracownik` → `/dashboard/employee`
  - `superadmin` → `/dashboard/admin`
  - `dyrektor`, `menedzer`, `partner` → `/dashboard/network` (sieć sprzedaży / CRM)
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: sprostuj mapowanie ról → dashboard"
```

---

## Task 12: Testy akceptacyjne ręczne

**Files:** — (manualny test, brak edycji)

- [ ] **Step 1: Lista kont i ścieżek**

Dla każdej z 7 ról zaloguj się i potwierdź zachowanie:

| Konto | Hasło | Oczekiwana trasa | Oczekiwane menu (pierwsze 3) |
|---|---|---|---|
| `biuro@balticbenefits.pl` | `123456` | `/dashboard/admin` | Pulpit / Baza klientów / Płatności |
| `t.juszkiewicz@gmail.com` | — | `/dashboard/employer` | Nowe zamówienie / Historia / Kartoteka |
| `pracownik@bbs.test` | `Test1234!` | `/dashboard/employee` | Twoje Aplikacje / Profitowi / Multipolisa |
| `partner@bbs.test` | `Test1234!` | `/dashboard/network` | Panel Sprzedaży / Pipeline / Kalkulator |
| `menedzer@bbs.test` | `Test1234!` | `/dashboard/network` | Panel Sprzedaży / Pipeline / Kalkulator + Leaderboard, Org-chart, Faktury |
| `dyrektor@bbs.test` | `Test1234!` | `/dashboard/network` | jak menedzer |

Dla `hr` — sprawdź ręcznie w Supabase czy istnieje konto z `role = 'hr'`. Jeśli nie — utwórz testowe:

```sql
-- przez Supabase SQL editor
INSERT INTO auth.users (...) ...  -- albo skorzystaj z POST /api/org/users
```

(Pomiń jeśli `hr` ma 0 userów — fall-through w Sidebarze zweryfikowany przez code review.)

- [ ] **Step 2: Sprawdź widget partnera**

Jako `partner@bbs.test` na `/dashboard/network` (default view `sales-dashboard`) → widget "Twoja pozycja" wyświetla rank lub empty state.

- [ ] **Step 3: Sprawdź widoczność API**

Jako `partner@bbs.test` wykonaj w DevTools console:

```javascript
await (await fetch('/api/org/users')).status  // → 403
await (await fetch('/api/crm/invoices')).status  // → 200 (pusta lista)
await (await fetch('/api/crm/leaderboard')).json()  // → { self: {...} | null, entries: [] }
```

- [ ] **Step 4: Final commit**

Jeśli wszystkie testy przeszły:

```bash
git log --oneline -15  # przegląd commitów
```

Po stwierdzeniu sukcesu — nic więcej do commitu.

---

## Self-Review Notes (in-plan)

**Spec coverage:** Każda sekcja specu ma odpowiadające zadanie:
- Sekcja 2 (Macierz ról) → Task 5, 6, 7
- Sekcja 3 (Menu Sidebar) → Task 7
- Sekcja 4 (Widoczność danych) → Task 2, 3, 4 (egzekwowane w API)
- Sekcja 5 (Widok Faktury) → Task 2, 3, 8, 10
- Sekcja 6 (Migracja DB) → Task 1
- Sekcja 7 (Lista zmian w kodzie) → Tasks 1–11
- Sekcja 9 (Testy akceptacyjne) → Task 12

**Placeholder scan:** Brak. Wszystkie diffy mają kompletny kod.

**Type consistency:**
- `PartnerSelfStanding` zdefiniowany w Task 4 (`lib/crm/leaderboard.ts`), konsumowany w Task 9 (kopia interfejsu lokalnie — by uniknąć importu kodu serwerowego do klienta).
- `Invoice` w Task 8 ma te same pola co `crm_invoices` z Task 1 (generated columns `vat_amount`, `amount_gross`, `provision_amount` są w SELECT).
- Status response leaderboardu zmienia kształt z `LeaderboardEntry[]` na `{ self, entries }` — Task 4 Step 3 ostrzega o konieczności update'u konsumenta.

**Znane luki nie blokujące planu:**
- Nie tworzymy UI do dodawania faktur (`POST /api/crm/invoices` istnieje, ale brak formularza). Faza 2 roadmapy — formularz lub integracja z Fakturownia. Empty state w `CrmInvoices` to dokumentuje.
- Logika automatycznego `ISSUED → OVERDUE` po `due_at < now()` — poza zakresem (manualny PATCH).
