import { CalcConfig, TrybSkladek, TypUmowy, ZusSkladkiPracownik, ZusSkladkiPracodawca } from './types';

const r = (v: number) => Math.round(v * 100) / 100;

export function obliczZusPracownik(
  brutto:   number,
  typUmowy: TypUmowy,
  tryb:     TrybSkladek,
  chorobowe: boolean,
  cfg:      CalcConfig,
): ZusSkladkiPracownik {
  if (tryb === 'STUDENT_UZ' || tryb === 'INNY_TYTUL') {
    return { emerytalna: 0, rentowa: 0, chorobowa: 0, suma: 0 };
  }

  const s = typUmowy === 'UOP' ? cfg.zus.uop.pracownik : cfg.zus.uz.pracownik;
  const em = r(brutto * s.emerytalna / 100);
  const re = r(brutto * s.rentowa   / 100);
  let ch = 0;
  if (typUmowy === 'UOP') {
    ch = r(brutto * s.chorobowa / 100);
  } else if (chorobowe && tryb !== 'BEZ_CHOROBOWEJ') {
    ch = r(brutto * s.chorobowa / 100);
  }
  return { emerytalna: em, rentowa: re, chorobowa: ch, suma: r(em + re + ch) };
}

export function obliczZusPracodawca(
  brutto:        number,
  typUmowy:      TypUmowy,
  tryb:          TrybSkladek,
  stawkaWyp:     number,
  naliczajFP:    boolean,
  naliczajFGSP:  boolean,
  cfg:           CalcConfig,
): ZusSkladkiPracodawca {
  if (tryb === 'STUDENT_UZ' || tryb === 'INNY_TYTUL') {
    return { emerytalna: 0, rentowa: 0, wypadkowa: 0, fp: 0, fgsp: 0, suma: 0 };
  }

  const s = typUmowy === 'UOP' ? cfg.zus.uop.pracodawca : cfg.zus.uz.pracodawca;
  const em  = r(brutto * s.emerytalna / 100);
  const re  = r(brutto * s.rentowa    / 100);
  const wyp = r(brutto * stawkaWyp    / 100);
  const fp  = naliczajFP   ? r(brutto * s.fp   / 100) : 0;
  const fg  = naliczajFGSP ? r(brutto * s.fgsp / 100) : 0;
  return { emerytalna: em, rentowa: re, wypadkowa: wyp, fp, fgsp: fg, suma: r(em + re + wyp + fp + fg) };
}

export function obliczZdrowotna(podstawa: number, tryb: TrybSkladek, cfg: CalcConfig): number {
  if (tryb === 'STUDENT_UZ') return 0;
  return r(podstawa * cfg.zus.zdrowotna / 100);
}
