// Previsión de ventas: estacionalidad (mismo mes del año anterior) ajustada por
// la tendencia reciente (últimos 3 meses vs los mismos 3 del año previo).

export interface PuntoSerie {
  mes: string; // ISO date (primer día del mes)
  euros: number;
}

export function preverVentas(
  serie: PuntoSerie[],
  mesesFuturos = 6
): { mes: Date; euros: number }[] {
  if (!serie.length) return [];
  const mapa = new Map<string, number>();
  for (const p of serie) {
    const d = new Date(p.mes);
    mapa.set(`${d.getUTCFullYear()}-${d.getUTCMonth()}`, Number(p.euros));
  }

  const ultima = new Date(serie[serie.length - 1].mes);
  const val = (y: number, m: number) => mapa.get(`${y}-${m}`);

  // Factor de tendencia: suma últimos 3 meses / mismos 3 del año anterior
  let recient = 0, recientPrev = 0;
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.UTC(ultima.getUTCFullYear(), ultima.getUTCMonth() - i, 1));
    recient += val(d.getUTCFullYear(), d.getUTCMonth()) ?? 0;
    recientPrev += val(d.getUTCFullYear() - 1, d.getUTCMonth()) ?? 0;
  }
  const factor = recientPrev > 0 ? recient / recientPrev : 1;
  const factorAcotado = Math.max(0.5, Math.min(2, factor)); // evita extremos

  // Media de los últimos 3 meses (fallback si no hay año anterior)
  const media3 = recient / 3;

  const out: { mes: Date; euros: number }[] = [];
  for (let k = 1; k <= mesesFuturos; k++) {
    const d = new Date(Date.UTC(ultima.getUTCFullYear(), ultima.getUTCMonth() + k, 1));
    const mismoAnioAnt = val(d.getUTCFullYear() - 1, d.getUTCMonth());
    const pred = mismoAnioAnt != null ? mismoAnioAnt * factorAcotado : media3;
    out.push({ mes: d, euros: Math.max(0, Math.round(pred)) });
  }
  return out;
}
