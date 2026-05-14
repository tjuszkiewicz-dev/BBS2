export interface ZusSkladkiPracownik {
  emerytalna: number;
  rentowa:    number;
  chorobowa:  number;
  suma:       number;
}

export interface ZusSkladkiPracodawca {
  emerytalna: number;
  rentowa:    number;
  wypadkowa:  number;
  fp:         number;
  fgsp:       number;
  suma:       number;
}

export interface BaseCalcResult {
  netto:             number;
  brutto:            number;
  zusPracownik:      ZusSkladkiPracownik;
  zusPracodawca:     ZusSkladkiPracodawca;
  zdrowotna:         number;
  pit:               number;
  kup:               number;
  podstawaPit:       number;
  podstawaZdrowotna: number;
  stawkaPit:         number;
  kosztPracodawcy:   number;
}

export interface WynikPodzial {
  zasadnicza: BaseCalcResult;
  swiadczenie: {
    brutto:   number;
    netto:    number;
    zaliczka: number;
    kup:      number;
  };
  kosztPracodawcy: number;
  nettoCalkowite:  number;
  doWyplaty:       number;
}

export type PitMode = 'AUTO' | 'FLAT_0' | 'FLAT_12' | 'FLAT_32';
export type TypUmowy = 'UOP' | 'UZ';
export type TrybSkladek = 'PELNY' | 'STUDENT_UZ' | 'INNY_TYTUL' | 'BEZ_CHOROBOWEJ';

export interface Pracownik {
  id:             string;
  imie:           string;
  nettoDocelowe:  number;
  typUmowy:       TypUmowy;
  trybSkladek:    TrybSkladek;
  choroboweAktywne: boolean;
  pit2:           string;
  ulgaMlodych:    boolean;
  kupTyp:         'STANDARD' | 'PODWYZSZONE' | 'PROC_50';
  pitMode:        PitMode;
  skladkaFP:      boolean;
  skladkaFGSP:    boolean;
}

export interface WynikPracownika {
  pracownik:   Pracownik;
  standard:    BaseCalcResult;
  podzial:     WynikPodzial;
  oszczednosc: number;
}

export interface GlobalneWyniki {
  szczegoly: WynikPracownika[];
  podsumowanie: {
    sumaKosztStandard:         number;
    sumaKosztPodzial:          number;
    sumaBruttoSwiadczen:       number;
    oszczednoscBrutto:         number;
    prowizja:                  number;
    oszczednoscNetto:          number;
    oszczednoscRoczna:         number;
    sredniaOszczednoscNaEtat:  number;
  };
}

export interface CalcConfig {
  zus: {
    uop: {
      pracownik:  { emerytalna: number; rentowa: number; chorobowa: number };
      pracodawca: { emerytalna: number; rentowa: number; wypadkowa: number; fp: number; fgsp: number };
    };
    uz: {
      pracownik:  { emerytalna: number; rentowa: number; chorobowa: number };
      pracodawca: { emerytalna: number; rentowa: number; wypadkowa: number; fp: number; fgsp: number };
    };
    zdrowotna: number;
  };
  pit: {
    prog1Limit:            number;
    prog1Stawka:           number;
    prog2Stawka:           number;
    kwotaWolnaRoczna:      number;
    kwotaZmniejszajacaMies:number;
    kupStandard:           number;
    kupPodwyzszone:        number;
    uzKupProc:             number;
    uzKupAutorskie:        number;
  };
  placaMinimalna: { brutto: number; netto: number };
  minimalnaKwotaUZ: { zasadniczaNetto: number };
}

export const DEFAULT_CONFIG: CalcConfig = {
  zus: {
    uop: {
      pracownik:  { emerytalna: 9.76, rentowa: 1.5,  chorobowa: 2.45 },
      pracodawca: { emerytalna: 9.76, rentowa: 6.5,  wypadkowa: 1.67, fp: 2.45, fgsp: 0.1 },
    },
    uz: {
      pracownik:  { emerytalna: 9.76, rentowa: 1.5,  chorobowa: 2.45 },
      pracodawca: { emerytalna: 9.76, rentowa: 6.5,  wypadkowa: 1.67, fp: 2.45, fgsp: 0.1 },
    },
    zdrowotna: 9.0,
  },
  pit: {
    prog1Limit:             120000,
    prog1Stawka:            12,
    prog2Stawka:            32,
    kwotaWolnaRoczna:       30000,
    kwotaZmniejszajacaMies: 300,
    kupStandard:            250,
    kupPodwyzszone:         300,
    uzKupProc:              20,
    uzKupAutorskie:         50,
  },
  placaMinimalna:    { brutto: 4806, netto: 3605.85 },
  minimalnaKwotaUZ:  { zasadniczaNetto: 840.0 },
};
