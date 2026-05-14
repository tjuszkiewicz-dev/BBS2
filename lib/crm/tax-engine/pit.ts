const round = (v: number) => Math.round(v);

export function obliczPit(podstawa: number, pit2Kwota: string, ulgaMlodych: boolean, stawka: number): number {
  if (ulgaMlodych) return 0;
  let pit = round(podstawa) * (stawka / 100);
  const zm = parseFloat(pit2Kwota) || 0;
  if (zm > 0) pit -= zm;
  return Math.max(0, round(pit));
}
