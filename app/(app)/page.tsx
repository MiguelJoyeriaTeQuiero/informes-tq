import Link from "next/link";
import {
  getKpis,
  getSerieMensual,
  getRanking,
  getRangoFechas,
  rangoMes,
  type KpiRow,
} from "@/lib/queries";
import { OPERACION_LIST, type OperacionKey } from "@/lib/types";
import { fmtEur, fmtGramos, fmtNum, fmtVariacion, MESES } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { AreaTendencia, BarrasRanking } from "@/components/charts";
import { PeriodSelector } from "@/components/period-selector";
import { YearComparator } from "@/components/year-comparator";
import { EmptyState } from "@/components/empty-state";
import {
  ShoppingBag,
  ShoppingCart,
  CalendarClock,
  RefreshCcw,
  Wrench,
  ArrowRight,
  Coins,
  Scale,
} from "lucide-react";

export const dynamic = "force-dynamic";

const ICONOS: Record<OperacionKey, React.ReactNode> = {
  ventas: <ShoppingBag className="h-5 w-5" />,
  compras: <ShoppingCart className="h-5 w-5" />,
  reservas: <CalendarClock className="h-5 w-5" />,
  recuperables: <RefreshCcw className="h-5 w-5" />,
  trabajos: <Wrench className="h-5 w-5" />,
};

function mapKpis(rows: KpiRow[]): Record<string, KpiRow> {
  return Object.fromEntries(rows.map((r) => [r.operacion, r]));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const rango = await getRangoFechas();

  if (!rango.max) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500">
          Resumen de todas las operaciones del negocio.
        </p>
        <EmptyState />
      </div>
    );
  }

  const ref = new Date(rango.max);
  const anio = sp.anio ? parseInt(sp.anio) : ref.getUTCFullYear();
  const mes = sp.mes ? parseInt(sp.mes) : ref.getUTCMonth();

  const { desde, hasta } = rangoMes(anio, mes);
  const prev = rangoMes(anio - 1, mes);

  // 12 meses hacia atrás para la tendencia
  const desde12 = new Date(Date.UTC(anio, mes - 11, 1)).toISOString();

  const [kpis, kpisPrev, serie, rankingTiendas] = await Promise.all([
    getKpis(desde, hasta),
    getKpis(prev.desde, prev.hasta),
    getSerieMensual("todas", desde12, hasta),
    getRanking("ventas", "tienda", desde, hasta, 8),
  ]);

  const m = mapKpis(kpis);
  const mPrev = mapKpis(kpisPrev);

  const anioMin = rango.min ? new Date(rango.min).getUTCFullYear() : anio;
  const anios = Array.from({ length: anio - anioMin + 1 }, (_, i) => anioMin + i);

  const ventas = m["ventas"];
  const oroTotal = kpis.reduce((s, r) => s + Number(r.gramos_oro), 0);
  const plataTotal = kpis.reduce((s, r) => s + Number(r.gramos_plata), 0);
  const operacionesTotal = kpis.reduce((s, r) => s + Number(r.unidades), 0);

  const serieFmt = serie.map((s) => {
    const d = new Date(s.mes);
    return {
      label: `${MESES[d.getUTCMonth()].slice(0, 3)} ${String(d.getUTCFullYear()).slice(2)}`,
      euros: Number(s.euros),
      gramos: Number(s.gramos),
      unidades: Number(s.unidades),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {MESES[mes]} {anio} · resumen de todas las operaciones
        </p>
        <PeriodSelector anio={anio} mes={mes} anios={anios} />
      </div>

      {/* Resumen global */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Facturación (Ventas)"
          valor={fmtEur(ventas?.euros ?? 0)}
          icon={<ShoppingBag className="h-5 w-5" />}
          variacion={fmtVariacion(ventas?.euros ?? 0, mPrev["ventas"]?.euros ?? 0)}
          sub="vs mismo mes año anterior"
          acento
        />
        <KpiCard
          label="Oro movido (total)"
          valor={fmtGramos(oroTotal)}
          icon={<Coins className="h-5 w-5" />}
          sub="todas las operaciones"
        />
        <KpiCard
          label="Plata movida (total)"
          valor={fmtGramos(plataTotal)}
          icon={<Scale className="h-5 w-5" />}
          sub="todas las operaciones"
        />
        <KpiCard
          label="Nº operaciones"
          valor={fmtNum(operacionesTotal)}
          sub="líneas en el periodo"
        />
      </div>

      {/* Tarjetas por operación */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {OPERACION_LIST.map((op) => {
          const k = m[op.key];
          const kp = mPrev[op.key];
          return (
            <Link key={op.key} href={`/${op.key}`} className="group block">
              <div className="kpi-card h-full transition group-hover:shadow-glow">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-sand text-brand-dark">
                    {ICONOS[op.key]}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-blue" />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-500">{op.label}</p>
                <p className="font-display text-xl text-slate-900">
                  {fmtEur(k?.euros ?? 0)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {fmtNum(k?.unidades ?? 0)} ops · {fmtGramos(k?.gramos_total ?? 0)}
                </p>
                {(() => {
                  const v = fmtVariacion(k?.euros ?? 0, kp?.euros ?? 0);
                  return v.texto === "—" ? null : (
                    <p
                      className={`mt-1 text-xs font-medium ${
                        v.positivo ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {v.texto} interanual
                    </p>
                  );
                })()}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tendencia + Ranking */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="font-display text-lg text-slate-800">
            Evolución (últimos 12 meses)
          </h2>
          <p className="mb-3 text-xs text-slate-400">Importe agregado de todas las operaciones</p>
          <AreaTendencia data={serieFmt} dataKey="euros" formato="euro" />
        </div>
        <div className="panel p-5">
          <h2 className="font-display text-lg text-slate-800">Top tiendas</h2>
          <p className="mb-3 text-xs text-slate-400">Ventas del periodo</p>
          {rankingTiendas.length ? (
            <BarrasRanking data={rankingTiendas} formato="euro" />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Sin datos</p>
          )}
        </div>
      </div>

      {/* Comparador de años */}
      <YearComparator aniosDisponibles={anios} />
    </div>
  );
}
