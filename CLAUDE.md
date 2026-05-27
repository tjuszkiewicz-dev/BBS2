# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npx next dev --port 3010   # Start Next.js dev server (PRIMARY - deploys to Vercel)
node server/app.js          # Start PDF generation server on port 3015 (required for document export)

# Build & preview
npm run build   # next build only
npm run preview

# Tests
npx jest services/payrollService.test.ts   # Run payroll service unit tests
```

## Architecture

**BBS — Baltic Benefits System** — enterprise benefits management platform with role-based portals.

- **Live URL**: https://bbs2.vercel.app
- **Supabase project**: `vogyfffzlucppmddqsqw` (`vogyfffzlucppmddqsqw.supabase.co`)

### Framework

**Next.js 15 (App Router)** is the sole frontend framework. The project deploys to **Vercel** on every push to `main`.

- Next.js dev: port `3010`
- PDF server: port `3015`

### Auth

Supabase SSR (`@supabase/ssr`) + Server Actions + cookie-based sessions.
- Supabase project: `vogyfffzlucppmddqsqw.supabase.co`
- Login action: `app/actions/auth.ts` — reads role from `user_profiles`, returns `{ ok, redirectUrl }`
- Role → redirect mapping:
  - `pracodawca` → `/dashboard/employer`
  - `pracownik` → `/dashboard/employee`
  - `superadmin` → `/dashboard/admin`
  - `dyrektor`, `menedzer`, `partner` → `/dashboard/admin` (CRM panel)

### Routing (Next.js App Router)

- `/login` → `app/(auth)/login/page.tsx`
- `/dashboard/employee` → `app/dashboard/employee/page.tsx` → `EmployeeDashboardClient`
- `/dashboard/employer` → `app/dashboard/employer/page.tsx` → `EmployerDashboardClient`
- `/dashboard/admin` → `app/dashboard/admin/page.tsx`
- `/dashboard/network` → `app/dashboard/network/page.tsx`

Dashboard clients (`app/dashboard/_components/`) bridge Supabase session ↔ StrattonContext via `DashboardBootstrap`.

### State Management

All application state lives in `context/StrattonContext.tsx` (StrattonProvider). It composes modular hooks:
- `hooks/modules/useUserLogic.ts` — auth, user CRUD
- `hooks/modules/useOrderLogic.ts` — order placement & approval
- `hooks/modules/useVoucherLogic.ts` — voucher lifecycle
- `hooks/modules/useNotificationLogic.ts` — notifications

State is persisted to `localStorage` via `hooks/usePersistedState.ts`. Components access state via `hooks/useStrattonState.ts` and actions via `hooks/useStrattonSystem.ts`.

Initial demo data is seeded from `services/mockData.ts`.

### Backend (PDF Server)

`server/app.js` is a separate Express server (port **3015**) using Puppeteer. It handles `POST /api/generate-pdf` for document types: `DEBIT_NOTE`, `VAT_INVOICE`, `BUYBACK_AGREEMENT`, `IMPORT_REPORT`, `PROTOCOL`. Must be running independently alongside the Next.js dev server.

### Employee Dashboard Layout (`EmployeeDashboardClient.tsx`)

`app/dashboard/_components/EmployeeDashboardClient.tsx` — full layout with:
- Black header (`bg-black`) with BBS logo (`/logo.png`), search bar, balance widget, expiry widget, notifications, logout
- Hamburger `<Menu>` button (mobile only, `md:hidden`) → opens sidebar drawer (`isMobileSidebarOpen`)
- Desktop sidebar toggle (`hidden md:flex`) → `isDesktopSidebarOpen`
- `Sidebar` component (black theme)
- `SoftAurora` background (WebGL shader from `components/ui/SoftAurora.tsx`, `ssr: false`)
- `<main className="main-zoom">` — zoom 0.9 only on desktop via CSS (see `index.css`)
- Orange popup (`/popup_orange.png`) shown every login — `useState(true)`, no localStorage gate
  - Mobile: slides from bottom (`items-end`, `rounded-t-3xl`), Desktop: centered (`sm:items-center`, `rounded-2xl`)
- 3-column layout on `xl` screens: `240px` banner slots + center content
- Aurora params: `speed=0.4, scale=1.2, brightness=1.6, color1="#30df6a", color2="#4297cd", noiseFrequency=2, noiseAmplitude=3, bandHeight=0.7, bandSpread=1, octaveDecay=0.27, layerOffset=0.25`

### Employee Dashboard Content (`DashboardEmployee.tsx`)

`views/DashboardEmployee.tsx` — 3-column content layout:
- Left bottom banner (h=200): `<img src="/orange.png" className="w-full h-full object-cover" />`
- Right bottom banner (h=200): `<img src="/PZU.png" className="w-full h-full object-cover" />`

### Admin Dashboard Layout (`AdminDashboardClient.tsx`)

`app/dashboard/_components/AdminDashboardClient.tsx` — light-themed layout with:
- `AdminLayout` function: sidebar + white header + `<DashboardAdminNew>`
- Header: `bg-white border-slate-200`, hamburger on mobile, logo, search (Ctrl+K), notifications, logout
- Background: `backgroundColor: '#f1f5f9'`
- `currentView` state synced with `DashboardAdminNew` for tab navigation
- No StrattonContext props for content — `adminNew` components fetch data via API routes directly

### New Admin Panel (`DashboardAdminNew.tsx` + `components/adminNew/`)

`views/DashboardAdminNew.tsx` — tab-based admin UI:
- Tabs: **Pulpit**, **Baza klientów**, **Płatności i faktury**, **Archiwum**, **Vouchery**, **CRM Pipeline**, **CRM Kalkulator**, **CRM Kontakty**, **CRM Leaderboard**, **Org-chart**
- `VIEW_TO_TAB` mapping syncs Sidebar navigation with tab state
- `-m-4 md:-m-8` to compensate parent padding
- Each tab is a standalone component in `components/adminNew/` — fetches own data from API routes

### Sidebar (`components/Sidebar.tsx`)

Auto-themes based on role:
- `EMPLOYEE` → black theme (`bg-black`, white text)
- Other roles → white/light theme with BBS blue accent (`#deedf3`)

**SUPERADMIN / CRM menu items**:
```
admin-pulpit      Pulpit               LayoutDashboard
admin-klienci     Baza klientów        Users
admin-platnosci   Płatności i faktury  CreditCard
admin-archiwum    Archiwum             FolderOpen
admin-vouchery    Vouchery             Ticket
--- CRM section ---
crm-pipeline      Pipeline CRM         Target
crm-kalkulator    Kalkulator Prime      Calculator
crm-kontakty      Kontakty             UserRound
crm-leaderboard   Leaderboard          Trophy          (superadmin/dyrektor/menedzer)
--- Admin/Org section ---
admin-org-chart   Org-chart            Network         (superadmin/dyrektor/menedzer)
```

### CRM Module

**Dostęp:** role `superadmin`, `dyrektor`, `menedzer`, `partner` (nie: `pracodawca`, `pracownik`).

**Hierarchia widoczności** (tabela `user_profiles.manager_id`):
- `superadmin` → widzi wszystko
- `dyrektor` → widzi siebie + menedzerzy z `manager_id = self` + partnerzy pod tymi menedzerami
- `menedzer` → widzi siebie + partnerzy z `manager_id = self`
- `partner` → widzi tylko swoje rekordy

**Pliki:**
- `lib/crm/visibility.ts` — `getVisibleUserIds()` + `applyVisibilityFilter()`
- `lib/crm/tax-engine/` — silnik ZUS/PIT/gross-up (port z Stratton Prime)

**API routes** (`app/api/crm/`):
- `leads/` — GET/POST; `leads/[id]/` — GET/PATCH/DELETE
- `contacts/` — GET/POST; `contacts/[id]/` — GET/PUT/DELETE
- `activities/` — GET/POST (filtr `?lead_id=`); `activities/[id]/` — PATCH/DELETE
- `kalkulator/calculate/` — POST (kalkulacja ZUS/PIT); `kalkulator/sessions/` — GET

**Komponenty UI** (`components/adminNew/crm/`):
- `CrmPipeline.tsx` — widok lista + kanban (9 statusów pipeline), panel szczegółów z 4 zakładkami:
  - *Szczegóły*: dane firmy, SLA warning (>3 dni bez aktywności), rezerwacja NIP, edycja inline
  - *Kontakty*: lista + dodawanie kontaktów, flaga osoby decyzyjnej
  - *Aktywność*: timeline CALL/MEETING/EMAIL/NOTE, toggle ukończenia
  - *Oferty*: link do kalkulatora
- `CrmKalkulator.tsx` — 5-krokowy wizard kalkulacji Prime: Firma → Pracownicy → Standard → Prime → Business Case
- `CrmKontakty.tsx` — tabela + karty mobile, dodawanie/edycja kontaktów

**Pipeline statusy** (pole `leads.status`):
`NEW` → `IN_TALKS` → `OFFER_PREPARING` → `OFFER_GENERATED` → `CALCULATION_SENT` → `SPECIAL_OFFER` → `SIGNED` / `RESIGNED` / `TERMINATED`

**Supabase tabele CRM:**
- `leads` — leady (NIP, assigned_to, status, last_activity_at, city, industry, itp.)
- `crm_contacts` — kontakty powiązane z leadem przez `company_id`
- `crm_client_activities` — aktywności (CALL/MEETING/EMAIL/NOTE, lead_id, occurred_at, is_completed)
- `lead_notes` — notatki do leadów (lead_id, content, author_id, author_name, created_at), RLS via service role
- `crm_offers` — wygenerowane oferty PDF (lead_id, created_by, company_name, employees_count, provision_pct, total/net_savings_*, pdf_url, pdf_path, snapshot JSONB)
- `calculator_configs` — konfiguracje kalkulatora
- `payroll_calculations` — zapisane kalkulacje

**Storage bucket:**
- `offers` (private) — PDFy wygenerowanych ofert; ścieżka `oferty/{slug}-{ts}.pdf`, signed URL ważny 1 rok

### Generator ofert PDF (Kalkulator Ofertowy → Step5)

**Cel:** Z poziomu kroku 6 (Podsumowanie) kalkulatora handlowiec klika "Generuj ofertę" — system wytwarza 5-stronicowy sprzedażowy PDF gotowy do wysyłki klientowi.

**Pliki:**
- `lib/crm/offer/offerTemplate.ts` — `renderOfferHtml(data)` → HTML 5-stronicowej oferty A4 z inline CSS (gradienty, hero KPI, paski porównawcze, 6 filarów prawnych, 4 kroki, CTA)
- `app/api/crm/offers/generate/route.ts` — POST: renderuje HTML → wysyła do PDF servera (Puppeteer) → upload do Supabase Storage → wpis w `crm_offers` → zwraca signed URL (1 rok)
- `components/crm/calculator/steps/Step5Summary.tsx` — przycisk "Generuj ofertę" (gold) → auto-open w nowej zakładce + karta z linkami Otwórz/Pobierz

**Struktura PDF (sales psychology):**
1. **Cover** — gradient navy→teal, logo BBS, "Oferta dla [Klient]", doradca, slogan
2. **3 bóle** — pre-suasion (koszty ZUS, rotacja, brak zabezpieczenia) + wniosek
3. **Twój wynik** — hero z **roczną oszczędnością** (anchor effect), 4 KPI cards, wykres porównawczy Standard vs Ofertowy z callout %
4. **6 filarów prawnych** — Rozp. MPiPS 1998, Wyrok SN 2010, Interpretacja ZUS 2023, Ustawa PIT, Opinia [KANCELARIA…], Reforma PIP 2026
5. **4 kroki wdrożenia + CTA** — gradient navy→teal, tagi (bezpłatna/RODO/48h), dane kontaktowe, zastrzeżenia prawne (must-have)

**Wymaga:** PDF server (`node server/app.js` na porcie 3015) — endpoint `/api/generate-pdf-raw`.

**Treść marketingowa BBS** zapisana w pamięci: `memory/project_bbs_offer_content.md` (3 bóle, 6 filarów, 4 kroki, zastrzeżenia, value props).

### CRM Leaderboard (Gamification)

**Pliki:**
- `lib/crm/leaderboard.ts` — `fetchLeaderboard()`, typy `LeaderboardEntry`, `Period`
- `app/api/crm/leaderboard/route.ts` — GET `/api/crm/leaderboard?period=month|quarter|year`, widoczność hierarchiczna
- `app/api/crm/leaderboard/export/route.ts` — CSV eksport z medalami złoto/srebro/brąz
- `components/adminNew/crm/CrmLeaderboard.tsx` — podium top 3, tabela rankingowa, selektor okresu, eksport CSV

**Dostęp:** role `superadmin`, `dyrektor`, `menedzer` (partner nie widzi rankingu innych).

### Org-chart (D3)

**Pliki:**
- `app/api/org/users/route.ts` — GET lista userów z `manager_id`, widoczność hierarchiczna
- `app/api/org/users/[id]/route.ts` — PUT (name, role, manager_id) z granularną kontrolą uprawnień
- `components/adminNew/org/OrgChart.tsx` — D3 tree z zoom/pan, węzły kolorowane wg roli
- `components/adminNew/org/OrgNodeEditor.tsx` — panel slide-in do edycji węzła
- `components/adminNew/org/OrgChartView.tsx` — wrapper kompozytowy (dynamic import, `ssr: false`)

**Uwaga:** `manager_id` już istnieje w tabeli `user_profiles` — migracja SQL zbędna. D3 wymaga dynamic import z `ssr: false`.

### CSS (`index.css`)

Custom classes:
- `.main-zoom` — `zoom: 1` default, `zoom: 0.9` on `@media (min-width: 768px)` → desktop-only scaling
- `.pb-safe` — safe area padding for mobile

### Accounts (Supabase — projekt vogyfffzlucppmddqsqw)

| Email | Hasło | Rola | Redirect |
|---|---|---|---|
| `biuro@balticbenefits.pl` | `123456` | `superadmin` | `/dashboard/admin` |
| `dyrektor@bbs.test` | `Test1234!` | `dyrektor` | `/dashboard/admin` (CRM) |
| `menedzer@bbs.test` | `Test1234!` | `menedzer` | `/dashboard/admin` (CRM) |
| `partner@bbs.test` | `Test1234!` | `partner` | `/dashboard/admin` (CRM) |
| `t.juszkiewicz@gmail.com` | — | `pracodawca` | `/dashboard/employer` |
| `pracownik@bbs.test` | `Test1234!` | `pracownik` | `/dashboard/employee` |

**Hierarchia CRM (manager_id):**
- `partner@bbs.test` → manager: `menedzer@bbs.test`
- `menedzer@bbs.test` → manager: `dyrektor@bbs.test`
- `dyrektor@bbs.test` → brak managera (top)

### Key Types

`types.ts` is a barrel that re-exports all domain type files from `types/`:
- `types/enums.ts` — wszystkie enumy: `Role`, `VoucherStatus`, `OrderStatus`, `ContractType`, `NotificationTrigger`, `ServiceType`, `DocumentType`, `CommissionType`, itp.
- `types/user.ts` — `User`, `UserIdentity`, `UserOrganization`, `UserContract`, `UserFinance`, `UserAddress`, `IbanChangeRequest`
- `types/company.ts` — `Company`
- `types/voucher.ts` — `Voucher`, `Transaction`, `DistributionBatch`, `BuybackAgreement`
- `types/order.ts` — `Order`, `PayrollEntry`, `PayrollSnapshot`, `PayrollDecision`, `ImportRow`, `ImportHistoryEntry`
- `types/core.ts` — `EntityType`, `AuditLogEntry`, `Commission`, `QuarterlyPerformance`, `AnalyticMetric`
- `types/notification.ts` — `Notification`, `NotificationAction`, `NotificationConfig`
- `types/system.ts` — `SystemConfig`, `ServiceItem`, `DocumentTemplate`, `SupportTicket`, `IntegrationConfig`

Consumers import from `../types` or `@/types`. `types/database.ts` pozostaje osobnym plikiem Supabase schema (nie przez barrel).

### AI Integration

`DashboardEmployee` includes an AI Legal Assistant powered by Google Gemini (`@google/generative-ai`). The API key is loaded from `VITE_GEMINI_API_KEY` in `.env.local`.

`LegalAssistantDashboard` is loaded with `next/dynamic` + `ssr: false` (uses `html2pdf.js` which requires browser `self`).

### UI Components (react-bits)

Available in `components/ui/` and `components/bits/`:
- `components/ui/SoftAurora.tsx` + `SoftAurora.css` — WebGL shader aurora (OGL-based), use with `ssr: false`
- `components/ui/Orb.tsx` + `Orb.css` — animated orb
- `components/ui/MagicRings.tsx` + `MagicRings.css`
- `components/ui/ServiceCarousel.tsx` — Embla carousel, 4-column layout (`md:flex-[0_0_25%]`), `AppIconCard` min-height `220px`
- `components/bits/StarBorder/`
- `components/employee/mobile/WalletCard.tsx` — animated voucher balance card, `p-8` padding, white text

### Extracted Sub-Components & Helpers

- `utils/hrUtils.tsx` — typy i helpery HR (`HrOrder`, `STATUS_MAP`, `formatPeriod`, `buildOrderReportHtml`)
- `utils/formatters.ts` — `formatCurrency`, `formatDate`
- `lib/documents/pdfUtils.ts` — `ISSUER`, `generatePdfBuffer`, `uploadPdf`
- `lib/documents/umowaService.ts` — `createUmowaDocument`, `UmowaContext`
- `components/hr/dashboard/HRPageHeader.tsx` — nagłówek Panelu Kadrowego + definicja typu `HRTab`
- `components/hr/dashboard/documentBinderHelpers.ts` — `sanitizeFilename`, `generateClientSidePdf`, `enrichBatchWithRanges`
- `components/hr/modals/HROrderPickerModal.tsx`, `HROrderHistoryModal.tsx`, `HRAddEmployeeModal.tsx`
- `components/hr/dashboard/EmployeeCard.tsx` — `EmpDetailRow`, `EmployeeCard`
- `components/employee/dashboard/EmployeeWidgets.tsx` — `SectionDivider`, `AppIconCard`, `FloatingTabBar`
- `components/employee/dashboard/legal/constants.ts` — barrel re-export `wizardData`, `categoryConfig`, `documentTemplates`

`HRTab` jest definiowany i eksportowany z `HRPageHeader.tsx` — importuj stamtąd, nie deklaruj lokalnie.

### Path Aliases

`@/` maps to the repository root (configured in `tsconfig.json`).

### Known Issues / Gotchas

- Browser-only libraries (`html2pdf.js`, `ogl`/SoftAurora) must be loaded with `next/dynamic` + `{ ssr: false }`
- Logo BBS: `/public/logo.png` — białe tło, używaj CSS filter jeśli potrzeba inwersji
- `zoom` CSS property is in `.main-zoom` CSS class (not inline style) — applies desktop-only via media query
- All UI changes must work identically on **localhost:3010** AND **Vercel** — no localStorage-gated visibility
- CRM routes wymagają roli CRM — `pracodawca`/`pracownik` dostaną 401/403
- D3 (`OrgChart.tsx`) wymaga `next/dynamic` + `{ ssr: false }` — nie importuj bezpośrednio

### Roadmapa

**Faza 1 — wdrożona (commit `2d2671f`, 2026-05-19):**
- [x] Gamification / CRM Leaderboard — ranking sprzedaży z medalami, eksport CSV
- [x] Org-chart D3 — wizualizacja struktury firmy z edycją węzłów

**Faza 2 — zaplanowana:**
- [ ] AI Knowledge Base — pgvector + OpenAI, upload dokumentów przez admina, chat dla CRM
- [ ] Moduł prowizji CRM — integracja Fakturownia, automatyczne faktury prowizyjne

**Faza 3 — zaplanowana:**
- [ ] Pełny klient email IMAP — dla handlowców/menedżerów/dyrektorów bezpośrednio w panelu
