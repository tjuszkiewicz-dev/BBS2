import { BaseCalcResult, CalcConfig, Pracownik } from './types';
import { obliczPit } from './pit';
import { obliczZdrowotna, obliczZusPracownik, obliczZusPracodawca } from './zus';

const r = (v: number) => Math.round(v * 100) / 100;

export function obliczNettoZBrutto(brutto: number, p: Pracownik, cfg: CalcConfig, stawkaWyp: number): BaseCalcResult {
  const b = r(brutto);
  const zusPrac = obliczZusPracownik(b, p.typUmowy, p.trybSkladek, p.choroboweAktywne, cfg);
  const podstawaZdr = r(b - zusPrac.suma);
  const zdr = obliczZdrowotna(podstawaZdr, p.trybSkladek, cfg);

  let kup = cfg.pit.kupStandard;
  if (p.kupTyp === 'PODWYZSZONE') kup = cfg.pit.kupPodwyzszone;
  if (p.typUmowy === 'UZ') {
    const proc = p.kupTyp === 'PROC_50' ? cfg.pit.uzKupAutorskie : cfg.pit.uzKupProc;
    kup = r((b - zusPrac.suma) * proc / 100);
  }

  const dochod = b - zusPrac.suma - kup;
  const podstawaPit = Math.max(0, dochod);

  let stawka = cfg.pit.prog1Stawka;
  if (p.pitMode === 'FLAT_32') stawka = cfg.pit.prog2Stawka;
  else if (p.pitMode === 'FLAT_0') stawka = 0;

  const pit = obliczPit(podstawaPit, p.pit2, p.ulgaMlodych, stawka);
  const netto = r(b - zusPrac.suma - zdr - pit);

  const zusPracodawca = obliczZusPracodawca(b, p.typUmowy, p.trybSkladek, stawkaWyp, p.skladkaFP, p.skladkaFGSP, cfg);

  return {
    netto,
    brutto: b,
    zusPracownik:      zusPrac,
    zusPracodawca,
    zdrowotna:         zdr,
    pit,
    kup,
    podstawaPit:       Math.round(podstawaPit),
    podstawaZdrowotna: podstawaZdr,
    stawkaPit:         stawka,
    kosztPracodawcy:   r(b + zusPracodawca.suma),
  };
}

export function znajdzBruttoDlaNetto(nettoDocelowe: number, pracownik: Pracownik, cfg: CalcConfig, stawkaWyp: number): BaseCalcResult {
  const target = r(nettoDocelowe);
  let lo = target, hi = target * 2.5;

  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (obliczNettoZBrutto(mid, pracownik, cfg, stawkaWyp).netto < target) lo = mid;
    else hi = mid;
  }

  const approx = (lo + hi) / 2;
  const start = Math.floor((approx - 5) * 100);
  const end   = Math.ceil((approx + 5) * 100);

  let best: BaseCalcResult | null = null;
  let minDiff = Infinity;
  for (let i = start; i <= end; i++) {
    const c = i / 100;
    if (c <= 0) continue;
    const res  = obliczNettoZBrutto(c, pracownik, cfg, stawkaWyp);
    const diff = Math.abs(res.netto - target);
    if (diff < minDiff) { minDiff = diff; best = res; }
  }

  return best ?? obliczNettoZBrutto(r(approx), pracownik, cfg, stawkaWyp);
}
