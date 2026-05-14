import { CalcConfig, DEFAULT_CONFIG, GlobalneWyniki, Pracownik, WynikPracownika, WynikPodzial } from './types';
import { znajdzBruttoDlaNetto } from './grossUp';
import { obliczPit } from './pit';
import { obliczZusPracodawca } from './zus';

const r = (v: number) => Math.round(v * 100) / 100;

export function obliczPodzial(
  p:           Pracownik,
  stawkaWyp:   number,
  nettoZasad:  number,
  cfg:         CalcConfig,
): WynikPodzial {
  const wynikZas = znajdzBruttoDlaNetto(nettoZasad, p, cfg, stawkaWyp);
  const swNetto  = p.nettoDocelowe - nettoZasad;

  if (swNetto <= 0) {
    return {
      zasadnicza:      wynikZas,
      swiadczenie:     { brutto: 0, netto: 0, zaliczka: 0, kup: 0 },
      kosztPracodawcy: wynikZas.kosztPracodawcy,
      nettoCalkowite:  nettoZasad,
      doWyplaty:       nettoZasad,
    };
  }

  let stawkaSw = wynikZas.stawkaPit / 100;
  if (p.pitMode === 'FLAT_12') stawkaSw = cfg.pit.prog1Stawka / 100;
  else if (p.pitMode === 'FLAT_32') stawkaSw = cfg.pit.prog2Stawka / 100;
  else if (p.pitMode === 'FLAT_0') stawkaSw = 0;

  let wsKup = 0;
  if (p.typUmowy === 'UZ') {
    wsKup = (p.kupTyp === 'PROC_50' ? cfg.pit.uzKupAutorskie : cfg.pit.uzKupProc) / 100;
  }

  const swBruttoWst = swNetto / (1 - stawkaSw * (1 - wsKup));
  const kupSw = swBruttoWst * wsKup;
  const zaliczkaSw = Math.round((swBruttoWst - kupSw) * stawkaSw);
  const swBrutto   = swNetto + zaliczkaSw;
  const laczny     = wynikZas.brutto + swBrutto;

  let kupCalk = wynikZas.kup;
  if (p.typUmowy === 'UZ') {
    const proc = p.kupTyp === 'PROC_50' ? cfg.pit.uzKupAutorskie : cfg.pit.uzKupProc;
    kupCalk = (laczny - wynikZas.zusPracownik.suma) * proc / 100;
  }

  const podstawaPit = Math.round(Math.max(0, laczny - wynikZas.zusPracownik.suma - kupCalk));
  const kupOdSw = kupCalk - wynikZas.kup;

  let stawkaF = cfg.pit.prog1Stawka;
  if (p.pitMode === 'FLAT_32') stawkaF = cfg.pit.prog2Stawka;
  else if (p.pitMode === 'FLAT_0') stawkaF = 0;

  const pitCalk = obliczPit(podstawaPit, p.pit2, p.ulgaMlodych, stawkaF);
  const kwotaOdSw = pitCalk - (wynikZas.pit || 0);

  const zusPrac = obliczZusPracodawca(wynikZas.brutto, p.typUmowy, p.trybSkladek, stawkaWyp, p.skladkaFP, p.skladkaFGSP, cfg);
  const kosztPrac = r(wynikZas.brutto + zusPrac.suma + swBrutto);

  return {
    zasadnicza:  wynikZas,
    swiadczenie: { brutto: swBrutto, netto: swNetto, zaliczka: kwotaOdSw, kup: kupOdSw },
    kosztPracodawcy: kosztPrac,
    nettoCalkowite:  r(nettoZasad + swNetto),
    doWyplaty:       r(nettoZasad + swNetto),
  };
}

export function obliczGlobalnie(
  pracownicy:     Pracownik[],
  stawkaWyp:      number,
  prowizjaProc:   number,
  nettoZasadProc: number,
  cfg:            CalcConfig = DEFAULT_CONFIG,
): GlobalneWyniki {
  const szczegoly: WynikPracownika[] = pracownicy.map((p) => {
    const standard  = znajdzBruttoDlaNetto(p.nettoDocelowe, p, cfg, stawkaWyp);
    const nettoZas  = r(p.nettoDocelowe * (nettoZasadProc / 100));
    const podzial   = obliczPodzial(p, stawkaWyp, nettoZas, cfg);
    const oszczednosc = r(standard.kosztPracodawcy - podzial.kosztPracodawcy);
    return { pracownik: p, standard, podzial, oszczednosc };
  });

  const sumaStd  = szczegoly.reduce((s, w) => s + w.standard.kosztPracodawcy,   0);
  const sumaPodz = szczegoly.reduce((s, w) => s + w.podzial.kosztPracodawcy,    0);
  const sumaSw   = szczegoly.reduce((s, w) => s + w.podzial.swiadczenie.brutto, 0);
  const oszczBrutto  = r(sumaStd - sumaPodz);
  const prowizja     = r(sumaSw * prowizjaProc / 100);
  const oszczNetto   = r(oszczBrutto - prowizja);

  return {
    szczegoly,
    podsumowanie: {
      sumaKosztStandard:        r(sumaStd),
      sumaKosztPodzial:         r(sumaPodz),
      sumaBruttoSwiadczen:      r(sumaSw),
      oszczednoscBrutto:        oszczBrutto,
      prowizja,
      oszczednoscNetto:         oszczNetto,
      oszczednoscRoczna:        r(oszczNetto * 12),
      sredniaOszczednoscNaEtat: pracownicy.length ? r(oszczNetto / pracownicy.length) : 0,
    },
  };
}
