import { notFound } from "next/navigation";
import {
  getKpis,
  getKpisExtra,
  getSerieMensual,
  getSerieDiaria,
  getActividadSemana,
  getMapaCalor,
  getDesglosesMulti,
  getRangoFechas,
  getTiendas,
  rangoMes,
  type DimAnalitica,
} from "@/lib/queries";
import { getPreciosMetales } from "@/lib/metals";
import { createClient } from "@/lib/supabase/server";
import { OPERACIONES, type OperacionKey } from "@/lib/types";
import { fmtEur, fmtEur2, fmtGramos, fmtNum, fmtPct, fmtVariacion, MESES } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { DonutDistribucion, BarrasSemana } from "@/components/charts";
import { TrendToggle } from "@/components/trend-toggle";
import { AnalyticBreakdown } from "@/components/analytic-breakdown";
import { MovimientosTable } from "@/components/movimientos-table";
import { HeatmapActividad } from "@/components/heatmap-actividad";
import { TiendaComparator } from "@/components/tienda-comparator";
import { PeriodSelector } from "@/components/period-selector";
import { TiendaSelector } from "@/components/tienda-selector";
import { EmptyState } from "@/components/empty-state";
import {
  Coins, Euro, Receipt, Scale, ShoppingBag, Layers,
  Store, Users, Award, CalendarDays, Undo2, TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

const DIMS: { key: DimAnalitica; label: string }[] = [
  { key: "tienda", label: "Tienda" },
  { key: "empleado", label: "Empleado" },
  { key: "familia_prenda", label: "Familia" },
  { key: "metodo_pago", label: "Método de pago" },
  { key: "tipo_operacion", label: "Tipo de operación" },
  { key: "plataforma", label: "Plataforma" },
  { key: "origen_metal", label: "Origen del metal" },
];

// Tipos de operación que representan "retroceso" (para tasas de devolución/anulación)
const TIPOS_NEGATIVOS: Record<OperacionKey, { etiqueta: string; coincide: (t: string) => boolean }> = {
  ventas: { etiqueta: "Tasa de devolución", coincide: (t) => /devoluci/i.test(t) },
  compras: { etiqueta: "Tasa de anulación", coincide: (t) => /anulad|anulaci/i.test(t) },
  reservas: { etiqueta: "Tasa cancel./anul.", coincide: (t) => /cancelaci|anulaci/i.test(t) },
  recuperables: { etiqueta: "Tasa de anulación", coincide: (t) => /anulaci/i.test(t) },
  trabajos: { etiqueta: "Tasa de devolución", coincide: (t) => /devoluci/i.test(t) },
};

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function etiquetaMes(iso: string) {
  const d = new Date(iso);
  return `${MESES[d.getUTCMonth()].slice(0, 3)} ${String(d.getUTCFullYear()).slice(2)}`;
}

export default async function DetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ operacion: string }>;
  searchParams: Promise<{ anio?: string; mes?: string; tienda?: string }>;
}) {
  const { operacion } = await params;
  if (!(operacion in OPERACIONES)) notFound();
  const key = operacion as OperacionKey;
  const meta = OPERACIONES[key];

  const sp = await searchParams;
  const tienda = sp.tienda || null;
  const [rango, tiendas] = await Promise.all([getRangoFechas(), getTiendas()]);
  if (!rango.max) return <EmptyState />;

  const ref = new Date(rango.max);
  const anio = sp.anio ? parseInt(sp.anio) : ref.getUTCFullYear();
  const mes = sp.mes ? parseInt(sp.mes) : ref.getUTCMonth();
  const { desde, hasta } = rangoMes(anio, mes);
  const prev = rangoMes(anio - 1, mes);
  const desde12 = new Date(Date.UTC(anio, mes - 11, 1)).toISOString();
  const ytdDesde = new Date(Date.UTC(anio, 0, 1)).toISOString();
  const ytdPrevDesde = new Date(Date.UTC(anio - 1, 0, 1)).toISOString();

  const sb = await createClient();

  let recientesQ = sb.from(key)
    .select("fecha_operacion,codigo,tipo_operacion,descripcion_prenda,familia_prenda,quilate_prenda,metodo_pago,tienda,empleado,peso_g,pago_eur")
    .gte("fecha_operacion", desde).lt("fecha_operacion", hasta);
  let conteoQ = sb.from(key).select("*", { count: "exact", head: true })
    .gte("fecha_operacion", desde).lt("fecha_operacion", hasta);
  if (tienda) { recientesQ = recientesQ.eq("tienda", tienda); conteoQ = conteoQ.eq("tienda", tienda); }

  const [
    kpis, kpisPrev, kpisYtd, kpisYtdPrev, extra,
    serieMensual, serieDiaria, actividad, mapaCalor, recientes, conteo,
    metales, desglosesMap,
  ] = await Promise.all([
    getKpis(desde, hasta, tienda),
    getKpis(prev.desde, prev.hasta, tienda),
    getKpis(ytdDesde, hasta, tienda),
    getKpis(ytdPrevDesde, prev.hasta, tienda),
    getKpisExtra(key, desde, hasta, tienda),
    getSerieMensual(key, desde12, hasta, tienda),
    getSerieDiaria(key, desde, hasta, tienda),
    getActividadSemana(key, desde, hasta, tienda),
    getMapaCalor(key, desde12, hasta, tienda),
    recientesQ.order("fecha_operacion", { ascending: false }).range(0, 2999),
    conteoQ,
    key === "compras" ? getPreciosMetales().catch(() => null) : Promise.resolve(null),
    getDesglosesMulti(key, DIMS.map((d) => d.key), desde, hasta, prev.desde, prev.hasta, tienda),
  ]);

  const k = kpis.find((r) => r.operacion === key);
  const kp = kpisPrev.find((r) => r.operacion === key);
  const ky = kpisYtd.find((r) => r.operacion === key);
  const kyp = kpisYtdPrev.find((r) => r.operacion === key);

  const euros = Number(k?.euros ?? 0);
  const unidades = Number(k?.unidades ?? 0);
  const pesoTotal = Number(k?.gramos_total ?? 0);
  const oroT = Number(k?.gramos_oro ?? 0);
  const plataT = Number(k?.gramos_plata ?? 0);
  const ticket = unidades ? euros / unidades : 0;
  const eurosPorGramo = pesoTotal ? euros / pesoTotal : 0;

  const anioMin = rango.min ? new Date(rango.min).getUTCFullYear() : anio;
  const anios = Array.from({ length: anio - anioMin + 1 }, (_, i) => anioMin + i);

  const mensualFmt = serieMensual.map((s) => ({
    label: etiquetaMes(s.mes), euros: Number(s.euros), gramos: Number(s.gramos), unidades: Number(s.unidades),
  }));
  const diarioFmt = serieDiaria.map((s) => ({
    label: new Date(s.dia).getUTCDate().toString(), euros: Number(s.euros), gramos: 0, unidades: Number(s.unidades),
  }));
  const semanaFmt = DIAS.map((dia, i) => {
    const r = actividad.find((a) => a.dow === i);
    return { dia, euros: Number(r?.euros ?? 0), unidades: Number(r?.unidades ?? 0) };
  });

  const secciones = DIMS.map((d) => ({ key: d.key, label: d.label, filas: desglosesMap[d.key] ?? [] }));

  // Distribuciones
  const dMetodo = secciones.find((s) => s.key === "metodo_pago")!.filas.map((f) => ({ nombre: f.etiqueta, valor: Math.abs(f.euros) }));
  const otroT = Math.max(0, pesoTotal - oroT - plataT);
  const dMetal = [
    { nombre: "Oro", valor: oroT }, { nombre: "Plata", valor: plataT }, { nombre: "Otro", valor: otroT },
  ];

  // Tasa de devolución/anulación/cancelación a partir del desglose por tipo de operación
  const tiposFilas = secciones.find((s) => s.key === "tipo_operacion")!.filas;
  const totalAbs = tiposFilas.reduce((s, f) => s + Math.abs(f.euros), 0) || 1;
  const negAbs = tiposFilas.filter((f) => TIPOS_NEGATIVOS[key].coincide(f.etiqueta)).reduce((s, f) => s + Math.abs(f.euros), 0);
  const tasaNeg = negAbs / totalAbs;

  // Día punta del mes
  const diaPunta = serieDiaria.reduce(
    (best, s) => (Math.abs(Number(s.euros)) > Math.abs(best.euros) ? { dia: s.dia, euros: Number(s.euros) } : best),
    { dia: "", euros: 0 }
  );

  // Coste medio €/g pagado (compras) vs mercado
  const costeOro = oroT ? Math.abs(Number(extra.euros_oro)) / oroT : 0;
  const costePlata = plataT ? Math.abs(Number(extra.euros_plata)) / plataT : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {meta.label} · {tienda ? tienda : "todas las tiendas"} · {MESES[mes]} {anio}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <TiendaSelector tiendas={tiendas} actual={tienda ?? ""} />
          <PeriodSelector anio={anio} mes={mes} anios={anios} />
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Importe del mes" valor={fmtEur(euros)} icon={<Euro className="h-5 w-5" />}
          variacion={fmtVariacion(euros, Number(kp?.euros ?? 0))} sub="vs año anterior" acento />
        <KpiCard label="Operaciones" valor={fmtNum(unidades)} icon={<ShoppingBag className="h-5 w-5" />}
          variacion={fmtVariacion(unidades, Number(kp?.unidades ?? 0))} sub="vs año anterior" />
        <KpiCard label="Ticket medio" valor={fmtEur2(ticket)} icon={<Receipt className="h-5 w-5" />} />
        <KpiCard label="Precio medio / gramo" valor={fmtEur2(eurosPorGramo)} icon={<Scale className="h-5 w-5" />} />
        <KpiCard label="Oro movido" valor={fmtGramos(oroT)} icon={<Coins className="h-5 w-5" />}
          variacion={fmtVariacion(oroT, Number(kp?.gramos_oro ?? 0))} />
        <KpiCard label="Plata movida" valor={fmtGramos(plataT)} icon={<Layers className="h-5 w-5" />}
          variacion={fmtVariacion(plataT, Number(kp?.gramos_plata ?? 0))} />
      </div>

      {/* KPIs avanzados */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label={TIPOS_NEGATIVOS[key].etiqueta} valor={fmtPct(tasaNeg)} icon={<Undo2 className="h-5 w-5" />}
          sub="sobre el importe del mes" />
        <KpiCard label="Peso medio / pieza" valor={fmtGramos(extra.peso_medio)} icon={<Scale className="h-5 w-5" />} />
        <KpiCard label="Ticket máximo" valor={fmtEur2(extra.ticket_max)} icon={<Award className="h-5 w-5" />} />
        <KpiCard label="Tiendas activas" valor={fmtNum(extra.tiendas_activas)} icon={<Store className="h-5 w-5" />} />
        <KpiCard label="Empleados activos" valor={fmtNum(extra.empleados_activos)} icon={<Users className="h-5 w-5" />} />
        <KpiCard label="Día punta" icon={<CalendarDays className="h-5 w-5" />}
          valor={diaPunta.dia ? new Date(diaPunta.dia).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "—"}
          sub={diaPunta.dia ? fmtEur(diaPunta.euros) : undefined} />
      </div>

      {/* Acumulado anual (YTD) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={`Acumulado ${anio} (YTD)`} valor={fmtEur(Number(ky?.euros ?? 0))}
          variacion={fmtVariacion(Number(ky?.euros ?? 0), Number(kyp?.euros ?? 0))}
          icon={<TrendingUp className="h-5 w-5" />} sub={`vs ${anio - 1} a misma fecha`} />
        <KpiCard label="Operaciones YTD" valor={fmtNum(Number(ky?.unidades ?? 0))}
          variacion={fmtVariacion(Number(ky?.unidades ?? 0), Number(kyp?.unidades ?? 0))}
          sub={`vs ${anio - 1} a misma fecha`} />
        <KpiCard label="Oro YTD" valor={fmtGramos(Number(ky?.gramos_oro ?? 0))}
          variacion={fmtVariacion(Number(ky?.gramos_oro ?? 0), Number(kyp?.gramos_oro ?? 0))}
          sub={`vs ${anio - 1} a misma fecha`} />
        <KpiCard label="Plata YTD" valor={fmtGramos(Number(ky?.gramos_plata ?? 0))}
          variacion={fmtVariacion(Number(ky?.gramos_plata ?? 0), Number(kyp?.gramos_plata ?? 0))}
          sub={`vs ${anio - 1} a misma fecha`} />
      </div>

      {/* Coste vs mercado (solo compras) */}
      {key === "compras" && metales && (
        <div className="panel p-5">
          <h2 className="font-display text-lg text-slate-800">Coste de adquisición vs mercado</h2>
          <p className="mb-4 text-xs text-slate-400">Precio medio pagado por gramo comprado frente a la cotización actual</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { metal: "Oro", coste: costeOro, mercado: metales.oro.eurGramo, color: "#C8A164" },
              { metal: "Plata", coste: costePlata, mercado: metales.plata.eurGramo, color: "#9AA6B2" },
            ].map((m) => {
              const margen = m.mercado ? (m.mercado - m.coste) / m.mercado : 0;
              return (
                <div key={m.metal} className="rounded-xl border border-slate-100 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: m.color }} />
                    <span className="font-medium text-slate-700">{m.metal}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div><p className="text-xs text-slate-400">Coste medio</p><p className="font-semibold text-slate-800">{fmtEur2(m.coste)}/g</p></div>
                    <div><p className="text-xs text-slate-400">Mercado hoy</p><p className="font-semibold text-slate-800">{fmtEur2(m.mercado)}/g</p></div>
                    <div><p className="text-xs text-slate-400">Margen pot.</p><p className={`font-semibold ${margen >= 0 ? "text-emerald-600" : "text-red-500"}`}>{fmtPct(margen)}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Evolución */}
      <TrendToggle mensual={mensualFmt} diario={diarioFmt} />

      {/* Distribuciones + actividad semanal */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <h2 className="mb-1 font-display text-lg text-slate-800">Método de pago</h2>
          <p className="mb-2 text-xs text-slate-400">Importe del periodo</p>
          <DonutDistribucion data={dMetodo} formato="euro" />
        </div>
        <div className="panel p-5">
          <h2 className="mb-1 font-display text-lg text-slate-800">Reparto de metal</h2>
          <p className="mb-2 text-xs text-slate-400">Gramos del periodo</p>
          <DonutDistribucion data={dMetal} formato="num" />
        </div>
        <div className="panel p-5">
          <h2 className="mb-1 font-display text-lg text-slate-800">Actividad por día</h2>
          <p className="mb-2 text-xs text-slate-400">Importe por día de la semana</p>
          <BarrasSemana data={semanaFmt} formato="euro" />
        </div>
      </div>

      {/* Mapa de calor día × hora */}
      <HeatmapActividad data={mapaCalor} operacion={key} tiendaPagina={tienda} />

      {/* Comparativa de tiendas */}
      {!tienda && tiendas.length > 1 && <TiendaComparator operacion={key} tiendas={tiendas} />}

      {/* Desglose analítico multidimensional */}
      <AnalyticBreakdown secciones={secciones} />

      {/* Movimientos con filtros + exportación */}
      <MovimientosTable rows={(recientes.data as any[]) ?? []} total={conteo.count ?? 0} />
    </div>
  );
}
