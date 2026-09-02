/**
 * Generator oferty PDF dla TIAS LEGAL SMUGA SPÓŁKA KOMANDYTOWA.
 * Wersja 2 — najniższa krajowa 2025, 52% all-inclusive (legalizacja + kadrowa + wszystko).
 *
 * Uruchom:  node scripts/generate_tias_offer.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const ROOT       = resolve(__dirname, '..');

// ── Formattery (pl-PL) ────────────────────────────────────────────────────
const _plN = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 });
const _plD = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt   = n => _plN.format(Math.round(n));
const fmtD  = n => _plD.format(n);
const today = () => new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });
const sid   = ()  => 'BBS-' + Date.now().toString(36).toUpperCase().slice(-6);
const esc   = s   => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── Kolory ────────────────────────────────────────────────────────────────
const TEAL  = '#4a95a9';
const GOLD  = '#f0a500';
const NAVY  = '#1e3448';
const GREEN = '#16a34a';
const RED   = '#dc2626';
const PAPER = '#f8fafc';
const INK   = '#1e293b';

// ════════════════════════════════════════════════════════════════════════════
//  KALKULACJA — najniższa krajowa 2025 (4 666 PLN brutto)
//
//  Podstawa: Rozporządzenie RM z 2024 r. → minimalne wynagrodzenie 2025 = 4 666 PLN brutto
//
//  Odliczenia pracownika (umowa o pracę, pełny etat):
//    ZUS emerytalne  9,76%  = 455,40 PLN
//    ZUS rentowe     1,50%  =  69,99 PLN
//    ZUS chorobowe   2,45%  = 114,32 PLN
//    Suma ZUS prac.  13,71% = 639,71 PLN
//    Podstawa zdrowotna     = 4 666 – 639,71 = 4 026,29 PLN
//    Ubezp. zdrowotne 9%    = 362,37 PLN
//    Koszty uzysk.          = 250,00 PLN
//    Podstawa PIT           = 4 666 – 639,71 – 250 ≈ 3 776 PLN
//    Zaliczka PIT (12%)     = 453 PLN;  ulga = 300 PLN → zaliczka = 153 PLN
//    NETTO                  ≈ 3 511 PLN
//
//  Koszty pracodawcy (ZUS employer):
//    Emerytalne  9,76%  = 455,40 PLN
//    Rentowe     6,50%  = 303,29 PLN
//    Wypadkowe   1,67%  =  77,92 PLN
//    FP          2,45%  = 114,32 PLN
//    FGŚP        0,10%  =   4,67 PLN
//    Suma ZUS prac.     = 955,60 PLN
//    BRUTTO-BRUTTO      = 4 666 + 956 = 5 622 PLN
// ════════════════════════════════════════════════════════════════════════════
const workers        = 40;
const minGross       = 4_666;   // PLN brutto (najniższa krajowa 2025)
const minNet         = 3_511;   // PLN netto (wyliczone powyżej)
const bbpBrutto      = 5_622;   // PLN brutto-brutto (koszt pracodawcy)
const provPct        = 52;      // % prowizji BBS od brutto pracownika

// BBS pobiera 52% od brutto każdego pracownika — w tej kwocie zawarte są:
//   legalizacja pobytu, obsługa kadrowa, monitoring dokumentów, wsparcie prawne
const bbsPerWorker   = Math.round(minGross * provPct / 100);            // 2 426 PLN / pracownik / mies.
const bbsMonthly     = workers * bbsPerWorker;                           // 97 040 PLN / mies.
const bbsAnnual      = bbsMonthly * 12;                                  // 1 164 480 PLN / rok

const totalPayroll   = workers * bbpBrutto;                              // 224 880 PLN / mies.

// Porównanie rynkowe: zewnętrzny operator HR+legal dla 40 cudzoziemców
const marketMonthly  = 140_000;
const savingsM       = marketMonthly - bbsMonthly;                       // 42 960 PLN / mies.
const savingsY       = savingsM * 12;                                    // 515 520 PLN / rok
const savingsPct     = (savingsM / marketMonthly * 100).toFixed(1);     // "30.7"
const bbsPct         = (bbsMonthly / marketMonthly * 100).toFixed(1);   // "69.3"
const perEtat        = Math.round(savingsM / workers);                   // 1 074 PLN / etat

// ── Logo (tylko okładka — redukuje HTML z ~31 MB do ~6 MB) ──────────────
let logoDataUri = '';
const logoPath = resolve(ROOT, 'public', 'logo.png');
if (existsSync(logoPath)) {
  logoDataUri = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;
  console.log('✓ Logo załadowane');
} else {
  console.log('⚠ Logo nie znalezione — używam tekstu "BBS"');
}

const coverLogo = logoDataUri
  ? `<img src="${logoDataUri}" alt="Baltic Benefit System" style="height:32px;width:auto;display:block;">`
  : `<span style="color:${NAVY};font-weight:800;font-size:14pt;letter-spacing:1px;">BBS</span>`;

const pageLogo = `BBS · Baltic Benefit`;

// ── Dane ──────────────────────────────────────────────────────────────────
const firma = {
  nazwa:  'TIAS LEGAL SMUGA SPÓŁKA KOMANDYTOWA',
  nip:    '5223248892',
  krs:    '0001017434',
  regon:  '524385402',
  adres:  'ul. Aleje Jerozolimskie 98',
  miasto: '00-807 Warszawa',
  email:  'adam.smuga@tias.pl',
};

const advisor = {
  name:  'Grzegorz Grzegorczyk',
  tel:   '+48 725 920 219',
  email: 'grzegorz@balticbenefits.pl',
};

// ════════════════════════════════════════════════════════════════════════════
//  CSS
// ════════════════════════════════════════════════════════════════════════════
const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: A4; margin: 0; }
html, body { width: 210mm; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: ${INK}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

.page { width: 210mm; height: 297mm; padding: 18mm 16mm; position: relative; page-break-after: always; overflow: hidden; }
.page:last-child { page-break-after: auto; }

.cover { background: linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 100%); color: white; padding: 0; display: flex; flex-direction: column; }
.cover-header { padding: 18mm 16mm 0; display: flex; justify-content: space-between; align-items: flex-start; }
.cover-logo { background: white; padding: 8px 14px; border-radius: 10px; display: inline-flex; align-items: center; height: 48px; }
.cover-meta { text-align: right; font-size: 9pt; opacity: 0.85; line-height: 1.5; }
.cover-body { flex: 1; padding: 0 16mm; display: flex; flex-direction: column; justify-content: center; }
.cover-eyebrow { text-transform: uppercase; letter-spacing: 4px; font-size: 9pt; color: ${GOLD}; font-weight: 600; margin-bottom: 12px; }
.cover-title { font-size: 36pt; font-weight: 800; line-height: 1.05; margin-bottom: 10px; }
.cover-subtitle { font-size: 14pt; font-weight: 300; opacity: 0.9; line-height: 1.4; margin-bottom: 40px; }
.cover-prepared { border-left: 3px solid ${GOLD}; padding: 8px 18px; background: rgba(255,255,255,0.06); border-radius: 0 8px 8px 0; }
.cover-prepared-label { font-size: 8pt; opacity: 0.7; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
.cover-prepared-name  { font-size: 22pt; font-weight: 700; }
.cover-prepared-detail { font-size: 10pt; opacity: 0.8; margin-top: 4px; }
.cover-footer { padding: 0 16mm 18mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9pt; }
.cover-footer-block { opacity: 0.85; line-height: 1.6; }
.cover-tagline { font-style: italic; opacity: 0.95; font-size: 11pt; }

.content { background: ${PAPER}; }
.page-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8mm; border-bottom: 1px solid #e2e8f0; margin-bottom: 8mm; }
.page-header-logo { font-weight: 800; color: ${NAVY}; font-size: 11pt; letter-spacing: 1px; }
.page-header-meta { font-size: 8pt; color: #64748b; }
.page-footer { position: absolute; bottom: 10mm; left: 16mm; right: 16mm; display: flex; justify-content: space-between; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
h1.section-title { font-size: 24pt; color: ${NAVY}; font-weight: 800; margin-bottom: 4px; line-height: 1.1; }
.section-eyebrow { font-size: 9pt; color: ${TEAL}; text-transform: uppercase; letter-spacing: 3px; font-weight: 600; margin-bottom: 8px; }
.section-lead { font-size: 11pt; color: #475569; line-height: 1.5; margin-bottom: 10mm; max-width: 145mm; }

.pain-grid { display: flex; flex-direction: column; gap: 6mm; }
.pain-card { background: white; border-radius: 12px; padding: 5mm 6mm; border-left: 4px solid ${RED}; box-shadow: 0 2px 12px rgba(15,23,42,0.04); display: flex; gap: 6mm; align-items: flex-start; }
.pain-num { font-size: 32pt; font-weight: 800; color: ${RED}; opacity: 0.25; line-height: 1; min-width: 50px; }
.pain-body h3 { color: ${NAVY}; font-size: 12pt; margin-bottom: 3mm; font-weight: 700; }
.pain-body p { font-size: 10pt; line-height: 1.55; color: #475569; }
.pain-conclusion { margin-top: 8mm; background: linear-gradient(135deg, ${TEAL}10 0%, ${GOLD}10 100%); border: 1px solid ${TEAL}40; border-radius: 12px; padding: 5mm 6mm; }
.pain-conclusion-title { color: ${TEAL}; font-size: 11pt; font-weight: 700; margin-bottom: 2mm; }
.pain-conclusion-text  { font-size: 10pt; color: ${NAVY}; line-height: 1.5; }

.kpi-hero { background: linear-gradient(135deg, ${GREEN} 0%, #15803d 100%); color: white; border-radius: 16px; padding: 8mm; text-align: center; box-shadow: 0 8px 28px rgba(22,163,74,0.25); margin-bottom: 6mm; }
.kpi-hero-label { font-size: 10pt; text-transform: uppercase; letter-spacing: 3px; opacity: 0.9; margin-bottom: 4mm; font-weight: 600; }
.kpi-hero-value { font-size: 38pt; font-weight: 800; line-height: 1; margin-bottom: 3mm; }
.kpi-hero-sub   { font-size: 10pt; opacity: 0.85; }
.kpi-row { display: flex; gap: 4mm; margin-bottom: 6mm; }
.kpi-card { flex: 1; background: white; border-radius: 12px; padding: 4mm 5mm; border: 1px solid #e2e8f0; }
.kpi-card-label { font-size: 7.5pt; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; margin-bottom: 2mm; }
.kpi-card-value { font-size: 16pt; font-weight: 800; color: ${NAVY}; line-height: 1.1; }
.kpi-card-value.teal  { color: ${TEAL};  }
.kpi-card-value.gold  { color: ${GOLD};  }
.kpi-card-value.green { color: ${GREEN}; }
.kpi-card-sub { font-size: 8pt; color: #94a3b8; margin-top: 2px; }

.incl-box { background: ${TEAL}08; border: 1.5px solid ${TEAL}30; border-radius: 10px; padding: 4mm 5mm; margin-bottom: 6mm; }
.incl-title { font-size: 9pt; font-weight: 700; color: ${TEAL}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 3mm; }
.incl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 6mm; }
.incl-item { font-size: 9pt; color: ${NAVY}; display: flex; align-items: center; gap: 2mm; }
.incl-item::before { content: '✓'; color: ${GREEN}; font-weight: 800; font-size: 10pt; }

.chart-block { background: white; border-radius: 12px; padding: 6mm; border: 1px solid #e2e8f0; }
.chart-title { font-size: 11pt; font-weight: 700; color: ${NAVY}; margin-bottom: 5mm; }
.bar-row { margin-bottom: 4mm; }
.bar-label { display: flex; justify-content: space-between; font-size: 10pt; margin-bottom: 2mm; }
.bar-label .name  { color: #475569; font-weight: 500; }
.bar-label .value { color: ${NAVY};  font-weight: 700; }
.bar-track { height: 8mm; background: #f1f5f9; border-radius: 6px; overflow: hidden; }
.bar-fill  { height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 3mm; color: white; font-size: 8pt; font-weight: 600; }
.bar-fill.standard { background: linear-gradient(90deg, #64748b 0%, #475569 100%); }
.bar-fill.ofertowy { background: linear-gradient(90deg, ${TEAL} 0%, #2d7a8a 100%); }
.savings-callout { margin-top: 5mm; padding: 4mm 5mm; background: ${GREEN}15; border-left: 3px solid ${GREEN}; border-radius: 0 8px 8px 0; font-size: 10pt; color: ${NAVY}; }
.savings-callout strong { color: ${GREEN}; }

.pillar-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.pillar { background: white; border-radius: 10px; padding: 4mm 5mm; border-top: 3px solid ${TEAL}; box-shadow: 0 1px 4px rgba(15,23,42,0.04); }
.pillar-num { display: inline-block; width: 7mm; height: 7mm; background: ${TEAL}; color: white; border-radius: 50%; text-align: center; line-height: 7mm; font-weight: 800; font-size: 9pt; margin-bottom: 2mm; }
.pillar-title { font-size: 9pt; font-weight: 700; color: ${NAVY}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2mm; }
.pillar-text  { font-size: 8.5pt; color: #475569; line-height: 1.4; }
.pillar-cite  { font-size: 7.5pt; color: #94a3b8; margin-top: 2mm; font-style: italic; }

.steps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-bottom: 8mm; }
.step-card { background: white; border-radius: 10px; padding: 5mm; border: 1px solid #e2e8f0; position: relative; padding-left: 14mm; }
.step-num { position: absolute; left: 4mm; top: 5mm; width: 8mm; height: 8mm; background: ${GOLD}; color: white; border-radius: 50%; text-align: center; line-height: 8mm; font-weight: 800; font-size: 11pt; }
.step-title { font-weight: 700; color: ${NAVY}; font-size: 10pt; margin-bottom: 2mm; }
.step-text  { font-size: 9pt; color: #475569; line-height: 1.4; }
.step-meta  { font-size: 7.5pt; color: ${TEAL}; font-weight: 600; margin-top: 2mm; text-transform: uppercase; letter-spacing: 1px; }
.cta-block { background: linear-gradient(135deg, ${NAVY} 0%, ${TEAL} 100%); color: white; border-radius: 14px; padding: 7mm; text-align: center; margin-bottom: 6mm; }
.cta-title  { font-size: 16pt; font-weight: 700; margin-bottom: 3mm; }
.cta-sub    { font-size: 10pt; opacity: 0.9; margin-bottom: 5mm; line-height: 1.5; }
.cta-tags   { display: flex; gap: 3mm; justify-content: center; margin-bottom: 5mm; flex-wrap: wrap; }
.cta-tag    { background: rgba(255,255,255,0.15); padding: 2mm 4mm; border-radius: 6px; font-size: 9pt; font-weight: 600; }
.cta-contact { border-top: 1px solid rgba(255,255,255,0.2); padding-top: 4mm; font-size: 10pt; line-height: 1.6; }
.cta-contact strong { color: ${GOLD}; }
.disclaimer { margin-top: 4mm; font-size: 7pt; color: #94a3b8; line-height: 1.5; text-align: justify; }
`;

// ════════════════════════════════════════════════════════════════════════════
//  HTML
// ════════════════════════════════════════════════════════════════════════════
function buildHtml() {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<title>Oferta BBS — ${esc(firma.nazwa)}</title>
<style>${CSS}</style>
</head>
<body>

<!-- ═══════════ STRONA 1 — COVER ═══════════ -->
<section class="page cover">
  <div class="cover-header">
    <div class="cover-logo">${coverLogo}</div>
    <div class="cover-meta">
      Oferta nr ${sid()}<br>
      ${today()}
    </div>
  </div>

  <div class="cover-body">
    <div class="cover-eyebrow">Indywidualna oferta współpracy</div>
    <h1 class="cover-title">Baltic Benefit<br>System</h1>
    <p class="cover-subtitle">
      Kompleksowa obsługa legalizacyjno-kadrowa<br>
      pracowników cudzoziemskich
    </p>

    <div class="cover-prepared">
      <div class="cover-prepared-label">Oferta przygotowana dla</div>
      <div class="cover-prepared-name">${esc(firma.nazwa)}</div>
      <div class="cover-prepared-detail">
        NIP: ${esc(firma.nip)} · KRS: ${esc(firma.krs)} · REGON: ${esc(firma.regon)}<br>
        ${esc(firma.adres)}, ${esc(firma.miasto)} · ${esc(firma.email)}
      </div>
    </div>
  </div>

  <div class="cover-footer">
    <div class="cover-footer-block">
      <strong>Twój doradca:</strong><br>
      ${esc(advisor.name)}<br>
      ${esc(advisor.tel)} · ${esc(advisor.email)}
    </div>
    <div class="cover-footer-block cover-tagline">
      „Razem zwiększymy<br>wartość w ludziach"
    </div>
  </div>
</section>

<!-- ═══════════ STRONA 2 — 3 BÓLE ═══════════ -->
<section class="page content">
  <div class="page-header">
    <div class="page-header-logo">${pageLogo}</div>
    <div class="page-header-meta">www.baltic-benefit.pl</div>
  </div>

  <div class="section-eyebrow">Diagnoza · 3 kluczowe ryzyka</div>
  <h1 class="section-title">Czy te ryzyka dotyczą Twojego zespołu cudzoziemskiego?</h1>
  <p class="section-lead">
    Zatrudnianie pracowników cudzoziemskich wiąże się z trzema powtarzającymi się ryzykami,
    które kosztują czas, pieniądze i reputację firmy. Zanim porozmawiamy
    o rozwiązaniu — spojrzmy prawdzie w oczy.
  </p>

  <div class="pain-grid">
    <div class="pain-card">
      <div class="pain-num">01</div>
      <div class="pain-body">
        <h3>Złożone procedury legalizacyjne i ryzyko prawne</h3>
        <p>Pozwolenia na pracę, karty pobytu, wnioski do Urzędu Pracy — każdy błąd lub opóźnienie
        grozi mandatem do 30 000 zł i zakazem dalszego zatrudnienia cudzoziemców.
        Jeden przeoczony termin kosztuje firmę więcej niż roczna profesjonalna obsługa.</p>
      </div>
    </div>

    <div class="pain-card">
      <div class="pain-num">02</div>
      <div class="pain-body">
        <h3>Rozproszeni dostawcy — brak jednego operatora</h3>
        <p>Kancelaria imigracyjna + agencja HR + biuro kadrowe — każdy odpowiada za swój fragment.
        Gdy pojawia się błąd, nikt nie poczuwa się do odpowiedzialności za całość.
        Brak jednego, kompleksowego operatora generuje chaos i podwójne koszty.</p>
      </div>
    </div>

    <div class="pain-card">
      <div class="pain-num">03</div>
      <div class="pain-body">
        <h3>Ukryte koszty i nieprzewidywalność wydatków</h3>
        <p>Legalizacja, wnioski, kary, ponowne procedury — koszty pojawiają się nagle i bez zapowiedzi.
        Bez stałej, przewidywalnej stawki niemożliwe jest precyzyjne budżetowanie kosztów
        zarządzania cudzoziemcami na cały rok.</p>
      </div>
    </div>
  </div>

  <div class="pain-conclusion">
    <div class="pain-conclusion-title">Wniosek</div>
    <div class="pain-conclusion-text">
      Zarządzanie cudzoziemcami „po kawałkach" generuje ryzyko i nieprzewidywalne koszty.
      Baltic Benefit System oferuje <strong>kompleksową obsługę all-inclusive</strong>
      za jedną stałą stawkę — <strong>${provPct}% od wynagrodzenia brutto każdego pracownika.
      Jedna stawka. Wszystkie opłaty w cenie.</strong>
    </div>
  </div>

  <div class="page-footer">
    <div>BBS · Strona 2 / 5</div>
    <div>Oferta dla ${esc(firma.nazwa)}</div>
  </div>
</section>

<!-- ═══════════ STRONA 3 — KALKULACJA ═══════════ -->
<section class="page content">
  <div class="page-header">
    <div class="page-header-logo">${pageLogo}</div>
    <div class="page-header-meta">www.baltic-benefit.pl</div>
  </div>

  <div class="section-eyebrow">Twoja kalkulacja · ${workers} pracowników · najniższa krajowa 2025</div>
  <h1 class="section-title">BBS vs. rynek — co zyskuje Twoja firma</h1>
  <p class="section-lead">
    Kalkulacja dla <strong>${workers} pracowników cudzoziemskich</strong> zatrudnionych na najniższej krajowej 2025
    (${fmt(minGross)} zł brutto / ${fmt(minNet)} zł netto). BBS pobiera <strong>${provPct}%</strong> od wynagrodzenia
    brutto każdego pracownika. <em>W tej stawce zawarte są wszystkie opłaty.</em>
  </p>

  <!-- HERO: roczna oszczędność vs rynek -->
  <div class="kpi-hero">
    <div class="kpi-hero-label">Roczna oszczędność vs. rynek</div>
    <div class="kpi-hero-value">${fmt(savingsY)} zł</div>
    <div class="kpi-hero-sub">
      ${fmt(savingsM)} zł / mies. · ${fmt(perEtat)} zł na etat · BBS all-inclusive ${fmt(bbsMonthly)} zł / mies.
    </div>
  </div>

  <!-- 4 KPI -->
  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-card-label">Min. krajowa brutto / pracownik</div>
      <div class="kpi-card-value">${fmt(minGross)} zł</div>
      <div class="kpi-card-sub">netto: ${fmt(minNet)} zł / mies.</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-card-label">Koszt pracodawcy / mies. (brutto-brutto)</div>
      <div class="kpi-card-value">${fmt(totalPayroll)} zł</div>
      <div class="kpi-card-sub">${fmt(bbpBrutto)} zł / etat</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-card-label">BBS all-inclusive / mies. (${provPct}% × brutto)</div>
      <div class="kpi-card-value teal">${fmt(bbsMonthly)} zł</div>
      <div class="kpi-card-sub">${fmt(bbsPerWorker)} zł / etat · wszystko w cenie</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-card-label">BBS koszt roczny (all-inclusive)</div>
      <div class="kpi-card-value gold">${fmt(bbsAnnual)} zł</div>
      <div class="kpi-card-sub">bez żadnych dodatkowych opłat</div>
    </div>
  </div>

  <!-- Co wchodzi w 52% -->
  <div class="incl-box">
    <div class="incl-title">Co zawiera stawka ${provPct}%?</div>
    <div class="incl-grid">
      <div class="incl-item">Legalizacja pobytu i pracy</div>
      <div class="incl-item">Obsługa kadrowa pracowników</div>
      <div class="incl-item">Monitoring terminów dokumentów</div>
      <div class="incl-item">Wnioski i postępowania urzędowe</div>
      <div class="incl-item">Wsparcie prawne i doradztwo</div>
      <div class="incl-item">Brak ukrytych kosztów dodatkowych</div>
    </div>
  </div>

  <!-- Wykres vs rynek -->
  <div class="chart-block">
    <div class="chart-title">Miesięczny koszt obsługi 40 cudzoziemców — porównanie modeli</div>

    <div class="bar-row">
      <div class="bar-label">
        <span class="name">Rynkowy outsourcing HR + legal (szacunek)</span>
        <span class="value">${fmtD(marketMonthly)} zł</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill standard" style="width:100%">100%</div>
      </div>
    </div>

    <div class="bar-row">
      <div class="bar-label">
        <span class="name">BBS ${provPct}% all-inclusive (${fmt(minGross)} zł × ${provPct}% × ${workers})</span>
        <span class="value">${fmtD(bbsMonthly)} zł</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill ofertowy" style="width:${bbsPct}%">${bbsPct}%</div>
      </div>
    </div>

    <div class="savings-callout">
      <strong>Oszczędność vs. rynek:</strong> ${fmtD(savingsM)} zł / mies.
      (${savingsPct}% redukcji kosztu) — dzięki jednej umowie z BBS zamiast wielu rozproszonych dostawców.
    </div>
  </div>

  <div class="page-footer">
    <div>BBS · Strona 3 / 5</div>
    <div>Wartości dla ${workers} pracowników · najniższa krajowa 2025</div>
  </div>
</section>

<!-- ═══════════ STRONA 4 — PODSTAWY PRAWNE ═══════════ -->
<section class="page content">
  <div class="page-header">
    <div class="page-header-logo">${pageLogo}</div>
    <div class="page-header-meta">www.baltic-benefit.pl</div>
  </div>

  <div class="section-eyebrow">Podstawy prawne · Ugruntowany przepis · Potwierdzona praktyka</div>
  <h1 class="section-title">Legalność potwierdzona od 28 lat</h1>
  <p class="section-lead">
    Model Baltic Benefit System opiera się na aktach prawnych obowiązujących w polskim systemie prawnym
    <strong>nieprzerwanie od 1998 roku</strong> — uzupełnionych o orzecznictwo Sądu Najwyższego i oficjalne
    interpretacje ZUS.
  </p>

  <div class="pillar-grid">
    <div class="pillar">
      <div class="pillar-num">1</div>
      <div class="pillar-title">Rozp. MPiPS · 1998</div>
      <div class="pillar-text">Korzyści materialne uprawniające do nabycia usług po cenie niższej niż detaliczna są wyłączone z podstawy wymiaru składek ZUS. Kluczowa podstawa modelu BBS.</div>
      <div class="pillar-cite">Dz.U. 1998 nr 161 poz. 1106 · §2 ust. 1 pkt 26</div>
    </div>
    <div class="pillar">
      <div class="pillar-num">2</div>
      <div class="pillar-title">Wyrok SN · 2010</div>
      <div class="pillar-text">Sąd Najwyższy potwierdził, że uchwała Zarządu jest wystarczającą formą „przepisów o wynagradzaniu". Spółki mogą wdrożyć model w pełni legalnie aktem korporacyjnym.</div>
      <div class="pillar-cite">SN II UK 337/09 · 6.05.2010</div>
    </div>
    <div class="pillar">
      <div class="pillar-num">3</div>
      <div class="pillar-title">Interpretacja ZUS · 2023</div>
      <div class="pillar-text">ZUS oficjalnie potwierdza, że do zwolnienia ze składek wystarczy prosta wewnętrzna instrukcja współfinansowania. Obejmuje to również zleceniobiorców.</div>
      <div class="pillar-cite">DI/100000/43/620/2023 · 24.08.2023</div>
    </div>
    <div class="pillar">
      <div class="pillar-num">4</div>
      <div class="pillar-title">Ustawa o PIT</div>
      <div class="pillar-text">Różnica między wartością świadczenia a odpłatnością pracownika stanowi jego przychód — legalnie opodatkowany i ujmowany w deklaracji PIT-11. Pełna przejrzystość wobec US.</div>
      <div class="pillar-cite">t.j. Dz.U. 2024 poz. 226 ze zm.</div>
    </div>
    <div class="pillar">
      <div class="pillar-num">5</div>
      <div class="pillar-title">Opinia prawna · 2026</div>
      <div class="pillar-text">Kancelaria zewnętrzna wydała opinię potwierdzającą zgodność modelu z przepisami prawa pracy, cywilnego, podatkowego i ubezpieczeniowego — w tym pełną kwalifikację CIT i PIT.</div>
      <div class="pillar-cite">Opinia dotyczy modelu analogicznego do oferowanego</div>
    </div>
    <div class="pillar">
      <div class="pillar-num">6</div>
      <div class="pillar-title">Reforma PIP · 2026</div>
      <div class="pillar-text">Wzmocniona wymiana danych ZUS / PIP / KAS. Model BBS jest zaprojektowany tak, by przejść każdą kontrolę krzyżową — pełna ścieżka audytowa i kompletna dokumentacja.</div>
      <div class="pillar-cite">Rada Ministrów · luty 2026</div>
    </div>
  </div>

  <div class="page-footer">
    <div>BBS · Strona 4 / 5</div>
    <div>6 filarów prawnych</div>
  </div>
</section>

<!-- ═══════════ STRONA 5 — 4 KROKI + CTA ═══════════ -->
<section class="page content">
  <div class="page-header">
    <div class="page-header-logo">${pageLogo}</div>
    <div class="page-header-meta">www.baltic-benefit.pl</div>
  </div>

  <div class="section-eyebrow">Proces współpracy</div>
  <h1 class="section-title">4 kroki do wdrożenia</h1>

  <div class="steps-grid">
    <div class="step-card">
      <div class="step-num">1</div>
      <div class="step-title">Weryfikacja i wstępna rozmowa</div>
      <div class="step-text">Doradca weryfikuje kwalifikowalność firmy i omawia szczegóły dotyczące pracowników cudzoziemskich: liczba, narodowości, obecny status prawny.</div>
      <div class="step-meta">15 min · bez zobowiązań</div>
    </div>
    <div class="step-card">
      <div class="step-num">2</div>
      <div class="step-title">Lista pracowników i dokumenty</div>
      <div class="step-text">BBS przygotowuje harmonogram legalizacji. Dane przetwarzane zgodnie z RODO, wyłącznie do celów procesu legalizacyjno-kadrowego.</div>
      <div class="step-meta">RODO · zanonimizowane</div>
    </div>
    <div class="step-card">
      <div class="step-num">3</div>
      <div class="step-title">Podpisanie umowy</div>
      <div class="step-text">Umowa ramowa BBS — jedna stała stawka ${provPct}% od brutto, bez żadnych ukrytych kosztów. Harmonogram wdrożenia uzgodniony indywidualnie.</div>
      <div class="step-meta">max. 48h decyzji</div>
    </div>
    <div class="step-card">
      <div class="step-num">4</div>
      <div class="step-title">Legalizacja + monitoring</div>
      <div class="step-text">BBS prowadzi kompletną obsługę: legalizację, kadry, monitoring terminów dokumentów, wsparcie prawne — wszystko w ramach jednej stawki ${provPct}%.</div>
      <div class="step-meta">5–14 dni roboczych wdrożenie</div>
    </div>
  </div>

  <div class="cta-block">
    <div class="cta-title">Zadbajmy razem o Twój zespół cudzoziemski</div>
    <div class="cta-sub">
      Zarezerwuj 15 minut na niezobowiązującą rozmowę z Doradcą Baltic Benefit.<br>
      Jedna stawka ${provPct}% od brutto — bez dodatkowych opłat. Wszystko w cenie.
    </div>
    <div class="cta-tags">
      <span class="cta-tag">All-inclusive — ${provPct}% brutto</span>
      <span class="cta-tag">Brak ukrytych kosztów</span>
      <span class="cta-tag">Odpowiedź w 48h</span>
    </div>
    <div class="cta-contact">
      <strong>www.baltic-benefit.pl</strong> · biuro@baltic-benefit.pl<br>
      Doradca: ${esc(advisor.name)} · ${esc(advisor.email)} · ${esc(advisor.tel)}
    </div>
  </div>

  <div class="disclaimer">
    <strong>Zastrzeżenia.</strong> Minimalne wynagrodzenie 2025: ${fmt(minGross)} PLN brutto / ${fmt(minNet)} PLN netto (szacunek na podstawie obowiązujących stawek ZUS i PIT; rzeczywiste netto zależy od indywidualnej sytuacji pracownika, formy zatrudnienia i ulg podatkowych). Koszt pracodawcy (brutto-brutto) ${fmt(bbpBrutto)} PLN uwzględnia składki ZUS pracodawcy wg standardowych stawek; stawka wypadkowa może różnić się w zależności od branży i historii szkodowości. Prowizja BBS w wysokości ${provPct}% od wynagrodzenia brutto obejmuje wszystkie wymienione usługi; szczegółowy zakres reguluje umowa ramowa. Porównanie rynkowe ma charakter szacunkowy i ilustracyjny — rzeczywiste koszty outsourcingu mogą się różnić. Baltic Benefit Sp. z o.o. nie gwarantuje konkretnych oszczędności; każdy klient otrzymuje indywidualną wycenę. Uczestnictwo pracownika jest dobrowolne; odmowa nie wpływa na warunki zatrudnienia. Wynagrodzenie zasadnicze nigdy nie spada poniżej ustawowego minimum.
  </div>

  <div class="page-footer">
    <div>BBS · Strona 5 / 5</div>
    <div>Oferta wygenerowana ${today()}</div>
  </div>
</section>

</body>
</html>`;
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n=== Generator oferty BBS — TIAS LEGAL (v2) ===\n');
  console.log(`Firma:              ${firma.nazwa}`);
  console.log(`Pracownicy:         ${workers}`);
  console.log(`Najniższa krajowa:  ${fmt(minGross)} PLN brutto / ${fmt(minNet)} PLN netto`);
  console.log(`Koszt pracodawcy:   ${fmt(bbpBrutto)} PLN / etat (brutto-brutto)`);
  console.log(`Łączny payroll:     ${fmt(totalPayroll)} PLN / mies.`);
  console.log(`BBS ${provPct}% / etat:      ${fmt(bbsPerWorker)} PLN / mies.`);
  console.log(`BBS łącznie:        ${fmt(bbsMonthly)} PLN / mies. = ${fmt(bbsAnnual)} PLN / rok`);
  console.log(`Oszczędność:        ${fmt(savingsM)} PLN / mies. = ${fmt(savingsY)} PLN / rok vs. rynek`);
  console.log('');
  console.log('Stawka 52% zawiera: legalizację, obsługę kadrową, monitoring, wsparcie prawne.');
  console.log('');

  const html    = buildHtml();
  const htmlOut = resolve(ROOT, 'tmp_tias_offer.html');
  writeFileSync(htmlOut, html, 'utf8');
  console.log(`✓ HTML zapisany: ${htmlOut}`);

  const PDF_SERVER = process.env.PDF_SERVER_URL ?? 'http://localhost:3015';
  const pdfOut     = 'C:\\Users\\Użytkownik\\Desktop\\Oferta_TIAS_LEGAL.pdf';

  console.log(`\nWywołuję PDF server: ${PDF_SERVER}/api/generate-pdf-raw ...`);

  let pdfBuffer = null;
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(`${PDF_SERVER}/api/generate-pdf-raw`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        html,
        pdfOptions: { margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' } },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${await res.text()}`);
    pdfBuffer = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error(`✗ Błąd PDF server: ${err.name === 'AbortError' ? 'Timeout 30s' : err.message}`);
  }

  if (pdfBuffer) {
    writeFileSync(pdfOut, pdfBuffer);
    console.log(`\n✓ PDF zapisany: ${pdfOut}`);
    console.log(`  Rozmiar: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);
  } else {
    console.log('\n⚠ PDF nie wygenerowany. Opcje:');
    console.log('  1. node server/app.js  →  node scripts/generate_tias_offer.mjs');
    console.log(`  2. Otwórz w Chrome → Ctrl+P → Zapisz PDF: ${htmlOut}`);
  }
}

main().catch(err => { console.error('Błąd:', err); process.exit(1); });
