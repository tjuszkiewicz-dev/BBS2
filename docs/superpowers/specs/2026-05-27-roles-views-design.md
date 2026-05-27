# Role i widoki w BBS — uporządkowanie

**Data:** 2026-05-27
**Autor:** Tomasz Juszkiewicz (we współpracy z Claude Code)
**Status:** Zatwierdzony — do implementacji

## 1. Cel

Uporządkować obecne 7 ról w BBS: doprecyzować widoki, uprawnienia, naprawić niespójności między kodem a CLAUDE.md, dodać brakujący widok "Faktury i płatności" dla sieci sprzedaży.

## 2. Zakres ról (bez zmian w DB CHECK constraint)

Wszystkie 7 ról zostaje. DB CHECK constraint `user_profiles_role_check` nie wymaga migracji.

| DB rola | TS enum | Etykieta UI | Trasa po loginie |
|---|---|---|---|
| `superadmin` | `Role.SUPERADMIN` | Administrator | `/dashboard/admin` |
| `pracodawca` | `Role.HR` | Pracodawca | `/dashboard/employer` |
| `hr` | `Role.HR_PANEL` | Panel HR | **`/dashboard/employer`** (zmiana) |
| `pracownik` | `Role.EMPLOYEE` | Pracownik | `/dashboard/employee` |
| `partner` | `Role.ADVISOR` | Doradca | `/dashboard/network` |
| `menedzer` | `Role.MANAGER` | Manager | `/dashboard/network` |
| `dyrektor` | `Role.DIRECTOR` | Dyrektor | `/dashboard/network` |

**Rola `hr`** = delegowany kadrowiec u pracodawcy. Pełny klon uprawnień pracodawcy (te same pozycje menu i ta sama trasa). Istnieje formalnie jako osobna rola dla audytu/możliwości przyszłej dywergencji.

## 3. Menu w Sidebarze per rola

### superadmin (bez zmian)
Pulpit / Baza klientów / Płatności i faktury / Archiwum / Vouchery / Anulowanie subskrypcji / Użytkownicy / **CRM**: Pipeline / Kalkulator / Kontakty / Leaderboard / Org-chart / **HR**: Pracownicy / Umowy / Raporty HR

### pracodawca + hr (te same pozycje)
Nowe zamówienie / Historia zamówień / Kartoteka pracowników / Płatności i faktury

### pracownik (bez zmian)
Twoje Aplikacje / Profitowi / Multipolisa.pl / Goldman Sachs / Wellbeing / Poradniki / E-booki / Historia / Centrum Pomocy / Aktywne usługi

### partner (ADVISOR) — zmiana
Pipeline / Kalkulator / **Faktury i płatności (swoje)**

NIE widzi: Leaderboard jako menu (zamiast tego widget na pulpicie sieci pokazuje jego pozycję), Org-chart.

### menedzer + dyrektor (DIRECTOR/MANAGER) — zmiana
Pipeline / Kalkulator / Leaderboard / Org-chart / **Faktury i płatności (zespół/pion)**

## 4. Widoczność danych (hierarchia)

Hierarchia oparta o `user_profiles.manager_id` (już istnieje). Logika w [lib/crm/visibility.ts](../../../lib/crm/visibility.ts) bez zmian.

| Zasób | superadmin | dyrektor | menedzer | partner | pracodawca/hr | pracownik |
|---|---|---|---|---|---|---|
| Leady, Kontakty, Aktywności, Notatki, Oferty, Kalkulacje | wszystko | pion (siebie + menedżerowie + ich partnerzy) | zespół (siebie + partnerzy) | tylko swoje | 403 | 403 |
| Leaderboard | wszystko | swój pion | swój zespół | **tylko swoja pozycja (widget)** | 403 | 403 |
| Org-chart | wszystko | swój pion | swój zespół | 403 | 403 | 403 |
| Faktury VAT + prowizje | wszystko | swój pion | swój zespół | swoje | 403 | 403 |
| Firmy-klienci, Vouchery, Zamówienia | wszystko | 403 | 403 | 403 | własna firma | własne |

## 5. Widok "Faktury i płatności" (nowy)

Wspólny widok dla całej sieci sprzedaży. Pokazuje:

1. **Faktury VAT klientów** — do wystawienia + wystawione + opłacone. Powiązane z `crm_offers.lead_id` → klient.
2. **Należna prowizja** sprzedawcy — od każdej opłaconej faktury VAT, wyliczana z `crm_offers.provision_pct × invoice.amount_net`.
3. **Filtrowanie wg hierarchii** — partner: swoje; menedzer: zespół; dyrektor: pion; superadmin: wszystko.

Wymaga **nowej tabeli** `crm_invoices` (Faza 2 roadmapy — moduł prowizji CRM).

## 6. Migracja DB (`crm_invoices`)

```sql
CREATE TABLE crm_invoices (
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

CREATE INDEX idx_crm_invoices_issued_by ON crm_invoices(issued_by);
CREATE INDEX idx_crm_invoices_lead_id   ON crm_invoices(lead_id);
CREATE INDEX idx_crm_invoices_status    ON crm_invoices(status);
```

RLS nie włączamy (status quo dla CRM tabel — egzekwujemy w API przez service role).

Status `OVERDUE` ustawiany ręcznie przez PATCH (na razie). Automatyczne przejście `ISSUED → OVERDUE` po `due_at < now()` można dodać jako cron w przyszłości — poza zakresem tego specu.

## 7. Lista zmian w kodzie

### Edycje

| Plik | Zmiana |
|---|---|
| [lib/roleMap.ts](../../../lib/roleMap.ts) | `ROLE_DASHBOARD[Role.HR_PANEL]` z `/dashboard/admin` → `/dashboard/employer` |
| [components/Sidebar.tsx](../../../components/Sidebar.tsx) | `case Role.HR_PANEL` → te same pozycje co `Role.HR` (fall-through). Rozbić `DIRECTOR/MANAGER/ADVISOR` na 2 case'y: ADVISOR (Pipeline / Kalkulator / Faktury) + DIRECTOR\|MANAGER (Pipeline / Kalkulator / Leaderboard / Org-chart / Faktury). Usunąć `sales-commissions` (idzie do widoku faktur). Usunąć Leaderboard i Org-chart dla ADVISOR. |
| [app/dashboard/employer/page.tsx](../../../app/dashboard/employer/page.tsx) | `ALLOWED_ROLES` akceptuje `'hr'` obok `'pracodawca'` |
| [app/dashboard/_components/NetworkDashboardClient.tsx](../../../app/dashboard/_components/NetworkDashboardClient.tsx) | Dodać render dla `sales-platnosci` (nowy widok CrmInvoices). Na pulpicie sieci (`sales-dashboard`) dla roli `partner` — komponent `PartnerLeaderboardWidget`. |
| [app/api/crm/leaderboard/route.ts](../../../app/api/crm/leaderboard/route.ts) | Dla `partner` zwracać `{ self: { rank, sales, total_count }, entries: [] }` zamiast 403. Dla `pracodawca/hr/pracownik` → 403. |
| [app/api/org/users/route.ts](../../../app/api/org/users/route.ts) | Dla `partner/pracodawca/hr/pracownik` → 403. |
| `CLAUDE.md` | Sekcja "Auth" — sprostować: `dyrektor/menedzer/partner → /dashboard/network` (nie `/admin`). |

### Nowe pliki

| Plik | Cel |
|---|---|
| `app/api/crm/invoices/route.ts` | GET — lista faktur + kalkulacja prowizji z filtrem hierarchii. POST — utworzenie faktury (DRAFT). |
| `app/api/crm/invoices/[id]/route.ts` | GET/PATCH/DELETE pojedynczej faktury. Sprawdzenie widoczności. |
| `components/adminNew/crm/CrmInvoices.tsx` | Tabela: nr / klient / kwota netto / VAT / status / należna prowizja. Filtry, sortowanie. Empty state. |
| `components/crm/sales/PartnerLeaderboardWidget.tsx` | Karta "Twoja pozycja: #14 / 12 — 45 000 PLN" + delta vs poprzedni miesiąc. Tylko dla `partner`. Empty state gdy brak sprzedaży: "Brak sprzedaży w tym miesiącu — zacznij od pierwszej oferty". |
| `supabase/migrations/2026-05-27-create-crm-invoices.sql` | Migracja DDL z sekcji 6. |

## 8. Czego NIE ruszamy

- DB CHECK constraint `user_profiles_role_check` — wszystkie 7 ról zostaje.
- `manager_id` w `user_profiles` — schemat już jest.
- RLS na tabelach CRM — egzekwujemy w API (status quo).
- Menu `EMPLOYEE` (10 sekcji benefitów) — bez zmian.
- Menu `SUPERADMIN` — bez zmian.
- Istniejące endpointy `/api/crm/leads`, `/api/crm/contacts`, `/api/crm/activities`, `/api/crm/offers` — bez zmian (już używają `getVisibleUserIds()`).

## 9. Testy akceptacyjne

Po wdrożeniu, każda z 7 ról musi:

1. Po loginie wylądować na właściwej trasie (zgodnie z sekcją 2).
2. Widzieć w Sidebarze tylko pozycje z sekcji 3.
3. Próba bezpośredniego GET na endpoint poza zakresem → 403.
4. partner po wejściu na `/dashboard/network` widzi widget z własną pozycją, ale NIE widzi listy innych w Leaderboardzie.
5. menedzer widzi w Pipeline tylko leady swoich partnerów + swoje.
6. dyrektor widzi w Pipeline cały pion (jego menedzerowie + ich partnerzy + swoje).
7. hr po loginie ląduje na `/dashboard/employer` z identycznym menu co pracodawca.

## 10. Etapy wdrożenia

1. **Migracja DB** — `crm_invoices` (Supabase).
2. **Backend API** — `/api/crm/invoices/*`, modyfikacja `/api/crm/leaderboard`, `/api/org/users`.
3. **Routing + roleMap** — `lib/roleMap.ts`, `app/dashboard/employer/page.tsx`.
4. **Sidebar** — rozbicie case'ów.
5. **Widoki** — `CrmInvoices`, `PartnerLeaderboardWidget`, podłączenie w `NetworkDashboardClient`.
6. **CLAUDE.md** — sprostowanie sekcji Auth.
7. **Testy ręczne** — checklist z sekcji 9 dla wszystkich 7 kont testowych.
