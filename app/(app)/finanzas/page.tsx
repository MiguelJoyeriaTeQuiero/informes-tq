import { rentResumen, rentSerie, rentDesglose, rentFiscal } from "@/lib/finanzas-queries";
import { getRangoFechas, rangoMes } from "@/lib/queries";
import { fmtEur, fmtEur2, fmtNum, fmtPct, fmtVariacion, MESES } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { LineComparativa, PALETA } from "@/components/charts";
import { FinanzasBreakdown } from "@/components/finanzas-breakdown";
import { PeriodSelector } from "@/components/period-selector";
import { EmptyState } from "@/components/empty-state";
import { Euro, Coins, Percent, Receipt, Undo2, TrendingUp, Landmark } from "lucide-react";

export const dynamic = "force-dynamic";

const DIMS = [
  { key: "familia", label: "Familia" },
  { key: "metal", label: "Metal" },
  { key: "tienda", label: "Tienda" },
  { key: "empleado", label: "Empleado" },
  { key: "metodo_pago", label: "Método de pago" },
  { key: "origen_metal", label: "Nuevo / Ocasión" },
];

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const rango = await getRangoFechas();
  if (!rango.max) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500">Rentabilidad, margen y fiscalidad.</p>
        <EmptyState
          titulo="Datos de rentabilidad sin cargar"
          mensaje="Ejecuta la sincronización de rentabilidad para traer ventas con coste e IGIC: npm run sync:rentabilidad o el botón 'Sincronizar Rentabilidad' en Configuración."
        />
      </div>
    );
  }

  const ref = new Date(rango.max);
  const anio = sp.anio ? parseInt(sp.anio) : ref.getUTCFullYear();
  const mes = sp.mes ? parseInt(sp.mes) : ref.getUTCMonth();
  const { desde, hasta } = rangoMes(anio, mes);
  const prev = rangoMes(anio - 1, mes);
  const desde12 = new Date(Date.UTC(anio, mes - 11, 1)).toISOString();
  const ytdDesde = new Date(Date.UTC(anio, 0, 1)).toISOString();
  const ytdPrevDesde = new Date(Date.UTC(anio - 1, 0, 1)).toISOString();

  const [resumen, resumenPrev, ytd, ytdPrev, serie, fiscal, ...desg] = await Promise.all([
    rentResumen(desde, hasta),
    rentResumen(prev.desde, prev.hasta),
    rentResumen(ytdDesde, hasta),
    rentResumen(ytdPrevDesde, prev.hasta),
    rentSerie(desde12, hasta),
    rentFiscal(desde, hasta),
    ...DIMS.map((d) => rentDesglose(d.key, desde, hasta)),
  ]);

  if (resumen.unidades === 0 && ytd.unidades === 0) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500">Rentabilidad, margen y fiscalidad.</p>
        <EmptyState
          titulo="Sin datos de rentabilidad"
          mensaje="Sincroniza la rentabilidad (productos vendidos con coste e IGIC) desde Configuración o con npm run sync:rentabilidad."
        />
      </div>
    );
  }

  const margenPct = resumen.ingresos ? resumen.margen / resumen.ingresos : 0;
  const anioMin = rango.min ? new Date(rango.min).getUTCFullYear() : anio;
  const anios = Array.from({ length: anio - anioMin + 1 }, (_, i) => anioMin + i);

  const serieData = serie.map((s) => {
    const d = new Date(s.mes);
    return {
      mes: `${MESES[d.getUTCMonth()].slice(0, 3)} ${String(d.getUTCFullYear()).slice(2)}`,
      Ingresos: Number(s.ingresos),
      Margen: Number(s.margen),
    };
  });
  const secciones = DIMS.map((d, i) => ({ key: d.key, label: d.label, filas: desg[i] }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Rentabilidad y fiscalidad · {MESES[mes]} {anio}</p>
        <PeriodSelector anio={anio} mes={mes} anios={anios} />
      </div>

      {/* KPIs de rentabilidad */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Ingresos" valor={fmtEur(resumen.ingresos)} icon={<Euro className="h-5 w-5" />}
          variacion={fmtVariacion(resumen.ingresos, resumenPrev.ingresos)} sub="vs año anterior" acento />
        <KpiCard label="Coste de ventas" valor={fmtEur(resumen.coste)} icon={<Coins className="h-5 w-5" />} />
        <KpiCard label="Margen bruto" valor={fmtEur(resumen.margen)} icon={<TrendingUp className="h-5 w-5" />}
          variacion={fmtVariacion(resumen.margen, resumenPrev.margen)} sub="vs año anterior" />
        <KpiCard label="% Margen" valor={fmtPct(margenPct)} icon={<Percent className="h-5 w-5" />} />
        <KpiCard label="Unidades vendidas" valor={fmtNum(resumen.unidades)} icon={<Receipt className="h-5 w-5" />} />
        <KpiCard label="Ticket medio" valor={fmtEur2(resumen.unidades ? resumen.ingresos / resumen.unidades : 0)} icon={<Undo2 className="h-5 w-5" />} />
      </div>

      {/* Cuenta de explotación + acumulado YTD */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="mb-1 font-display text-lg text-slate-800">Evolución de ingresos y margen</h2>
          <p className="mb-3 text-xs text-slate-400">Últimos 12 meses</p>
          <LineComparativa
            data={serieData}
            series={[{ key: "Ingresos", color: PALETA[0] }, { key: "Margen", color: PALETA[2] }]}
            formato="euro"
          />
        </div>
        <div className="panel p-5">
          <h2 className="mb-3 font-display text-lg text-slate-800">Cuenta de explotación</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Ingresos</dt><dd className="font-medium text-slate-800">{fmtEur(resumen.ingresos)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">− Coste de ventas</dt><dd className="text-slate-600">{fmtEur(resumen.coste)}</dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-2"><dt className="font-medium text-slate-700">= Margen bruto</dt><dd className="font-semibold text-brand-dark">{fmtEur(resumen.margen)} <span className="text-xs text-slate-400">({fmtPct(margenPct)})</span></dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Descuentos aplicados</dt><dd className="text-slate-600">{fmtEur(resumen.descuentos)}</dd></div>
          </dl>
          <div className="mt-4 rounded-xl bg-brand-sand/50 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Margen bruto acumulado {anio}</p>
            <p className="font-display text-xl text-brand-dark">{fmtEur(ytd.margen)}</p>
            {(() => { const v = fmtVariacion(ytd.margen, ytdPrev.margen); return v.texto === "—" ? null : (
              <p className={`text-xs ${v.positivo ? "text-emerald-600" : "text-red-500"}`}>{v.texto} vs {anio - 1}</p>
            ); })()}
          </div>
        </div>
      </div>

      {/* Margen por dimensión */}
      <FinanzasBreakdown secciones={secciones} />

      {/* Desglose fiscal IGIC */}
      <div className="panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 p-5">
          <Landmark className="h-5 w-5 text-brand-dark" />
          <h2 className="font-display text-lg text-slate-800">Desglose fiscal (IGIC)</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">Tipo IGIC</th>
              <th className="px-5 py-3 text-right font-medium">Base imponible</th>
              <th className="px-5 py-3 text-right font-medium">Cuota IGIC</th>
              <th className="px-5 py-3 text-right font-medium">Total</th>
              <th className="px-5 py-3 text-right font-medium">Líneas</th>
            </tr>
          </thead>
          <tbody>
            {fiscal.map((f, i) => (
              <tr key={i} className="border-b border-slate-50">
                <td className="px-5 py-2.5 font-medium text-slate-700">{fmtNum(Number(f.igic_pct))}%</td>
                <td className="px-5 py-2.5 text-right text-slate-600">{fmtEur2(Number(f.base_imponible))}</td>
                <td className="px-5 py-2.5 text-right text-slate-600">{fmtEur2(Number(f.cuota_igic))}</td>
                <td className="px-5 py-2.5 text-right font-medium text-slate-800">{fmtEur2(Number(f.total))}</td>
                <td className="px-5 py-2.5 text-right text-slate-500">{fmtNum(Number(f.unidades))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-100 bg-slate-50/60 font-semibold text-slate-700">
              <td className="px-5 py-3">Total</td>
              <td className="px-5 py-3 text-right">{fmtEur2(resumen.base_imponible)}</td>
              <td className="px-5 py-3 text-right">{fmtEur2(resumen.cuota_igic)}</td>
              <td className="px-5 py-3 text-right">{fmtEur2(resumen.base_imponible + resumen.cuota_igic)}</td>
              <td className="px-5 py-3 text-right">{fmtNum(resumen.unidades)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
