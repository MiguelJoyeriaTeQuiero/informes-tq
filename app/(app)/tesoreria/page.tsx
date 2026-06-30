import { getTesoreria } from "@/lib/extras-queries";
import { getRangoFechas, getTiendas, rangoMes } from "@/lib/queries";
import { fmtEur, MESES } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { LineComparativa, PALETA } from "@/components/charts";
import { PeriodSelector } from "@/components/period-selector";
import { TiendaSelector } from "@/components/tienda-selector";
import { EmptyState } from "@/components/empty-state";
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TesoreriaPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string; tienda?: string }>;
}) {
  const sp = await searchParams;
  const tienda = sp.tienda || null;
  const [rango, tiendas] = await Promise.all([getRangoFechas(), getTiendas()]);
  if (!rango.max) return <EmptyState />;

  const ref = new Date(rango.max);
  const anio = sp.anio ? parseInt(sp.anio) : ref.getUTCFullYear();
  const mes = sp.mes ? parseInt(sp.mes) : ref.getUTCMonth();
  const { hasta } = rangoMes(anio, mes);
  const desde12 = new Date(Date.UTC(anio, mes - 11, 1)).toISOString();
  const ytdDesde = new Date(Date.UTC(anio, 0, 1)).toISOString();

  const serie = await getTesoreria(desde12, hasta, tienda);
  const ytd = await getTesoreria(ytdDesde, hasta, tienda);

  const anioMin = rango.min ? new Date(rango.min).getUTCFullYear() : anio;
  const anios = Array.from({ length: anio - anioMin + 1 }, (_, i) => anioMin + i);

  const mesActual = serie[serie.length - 1] ?? { entradas: 0, salidas: 0, neto: 0 };
  const netoYtd = ytd.reduce((s, r) => s + Number(r.neto), 0);

  // Previsión de neto a 6 meses (estacional + tendencia, permite negativos)
  const mapa = new Map<string, number>();
  for (const r of serie) { const d = new Date(r.mes); mapa.set(`${d.getUTCFullYear()}-${d.getUTCMonth()}`, Number(r.neto)); }
  const ultima = serie.length ? new Date(serie[serie.length - 1].mes) : new Date(Date.UTC(anio, mes, 1));
  let r3 = 0, r3p = 0;
  for (let i = 0; i < 3; i++) {
    const d = new Date(Date.UTC(ultima.getUTCFullYear(), ultima.getUTCMonth() - i, 1));
    r3 += mapa.get(`${d.getUTCFullYear()}-${d.getUTCMonth()}`) ?? 0;
    r3p += mapa.get(`${d.getUTCFullYear() - 1}-${d.getUTCMonth()}`) ?? 0;
  }
  const factor = r3p !== 0 ? Math.max(0.5, Math.min(2, r3 / r3p)) : 1;
  const media3 = r3 / 3;

  const etq = (d: Date) => `${MESES[d.getUTCMonth()].slice(0, 3)} ${String(d.getUTCFullYear()).slice(2)}`;
  const chartData: Record<string, any>[] = serie.map((r) => {
    const d = new Date(r.mes);
    return { mes: etq(d), Entradas: Number(r.entradas), Salidas: Number(r.salidas), Neto: Number(r.neto), Previsión: null as number | null };
  });
  if (chartData.length) chartData[chartData.length - 1].Previsión = Number(serie[serie.length - 1].neto);
  for (let k = 1; k <= 6; k++) {
    const d = new Date(Date.UTC(ultima.getUTCFullYear(), ultima.getUTCMonth() + k, 1));
    const samePrev = mapa.get(`${d.getUTCFullYear() - 1}-${d.getUTCMonth()}`);
    const pred = Math.round(samePrev != null ? samePrev * factor : media3);
    chartData.push({ mes: etq(d), Entradas: null, Salidas: null, Neto: null, Previsión: pred });
  }
  const totalPrevision = chartData.filter((p) => p.Entradas === null).reduce((s, p) => s + (p.Previsión ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Tesorería · flujo de caja · {MESES[mes]} {anio}</p>
        <div className="flex flex-wrap items-center gap-2">
          <TiendaSelector tiendas={tiendas} actual={tienda ?? ""} />
          <PeriodSelector anio={anio} mes={mes} anios={anios} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Entradas del mes" valor={fmtEur(Number(mesActual.entradas))} icon={<ArrowUpCircle className="h-5 w-5" />} />
        <KpiCard label="Salidas del mes" valor={fmtEur(Math.abs(Number(mesActual.salidas)))} icon={<ArrowDownCircle className="h-5 w-5" />} />
        <KpiCard label="Flujo neto del mes" valor={fmtEur(Number(mesActual.neto))} icon={<Wallet className="h-5 w-5" />} acento />
        <KpiCard label={`Neto acumulado ${anio}`} valor={fmtEur(netoYtd)} icon={<TrendingUp className="h-5 w-5" />} sub="enero a la fecha" />
      </div>

      <div className="panel p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg text-slate-800">Flujo de caja y proyección</h2>
            <p className="text-xs text-slate-400">Entradas, salidas y neto (12 meses) + previsión del neto a 6 meses</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Neto previsto 6 meses</p>
            <p className="font-display text-xl text-brand-dark">{fmtEur(totalPrevision)}</p>
          </div>
        </div>
        <LineComparativa
          data={chartData}
          series={[
            { key: "Entradas", color: PALETA[1] },
            { key: "Salidas", color: "#ef4444" },
            { key: "Neto", color: PALETA[0] },
            { key: "Previsión", color: PALETA[2] },
          ]}
          formato="euro"
        />
      </div>
    </div>
  );
}
