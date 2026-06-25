import {
  getStockResumen, getStockPorDim, getStockAging, getStockEstados, getStockEvolucion,
} from "@/lib/stock-queries";
import { getPreciosMetales } from "@/lib/metals";
import { fmtEur, fmtGramos, fmtNum, fmtPct, MESES } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { AreaTendencia, BarrasRanking, DonutDistribucion } from "@/components/charts";
import { StockStatusSelector } from "@/components/stock-status-selector";
import { StockBreakdown } from "@/components/stock-breakdown";
import { EmptyState } from "@/components/empty-state";
import { Boxes, Euro, Coins, Scale, TrendingUp, Layers, Gem } from "lucide-react";

export const dynamic = "force-dynamic";

const DIMS = [
  { key: "store_name", label: "Tienda" },
  { key: "familia", label: "Familia" },
  { key: "metal", label: "Metal" },
  { key: "metal_source", label: "Nuevo / Ocasión" },
  { key: "karat", label: "Quilate" },
] as const;

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ estados?: string }>;
}) {
  const sp = await searchParams;
  const disponibles = await getStockEstados();

  if (!disponibles.length) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500">Valoración y análisis de existencias.</p>
        <EmptyState
          titulo="Inventario sin cargar"
          mensaje="Ejecuta la sincronización de inventario para traer las existencias desde Metabase: npm run sync:stock (carga inicial) o el botón 'Sincronizar inventario' en Configuración."
        />
      </div>
    );
  }

  const estados = sp.estados ? sp.estados.split(",").filter(Boolean) : ["DIS"];

  const [resumen, aging, evolucion, metales, ...dims] = await Promise.all([
    getStockResumen(estados),
    getStockAging(estados),
    getStockEvolucion(estados),
    getPreciosMetales().catch(() => null),
    ...DIMS.map((d) => getStockPorDim(estados, d.key)),
  ]);

  const margen = resumen.valor_pvp ? (resumen.valor_pvp - resumen.valor_coste) / resumen.valor_pvp : 0;
  const valorMercadoMetal = metales
    ? resumen.peso_oro * metales.oro.eurGramo + resumen.peso_plata * metales.plata.eurGramo
    : 0;

  const secciones = DIMS.map((d, i) => ({ key: d.key, label: d.label, filas: dims[i] }));
  const metalDim = secciones.find((s) => s.key === "metal")!.filas.map((f) => ({
    nombre: f.etiqueta, valor: Number(f.valor_coste),
  }));

  const agingBars = aging.map((a) => ({
    etiqueta: a.tramo, euros: Number(a.valor_coste), gramos: 0, unidades: Number(a.piezas),
  }));

  const evolBars = evolucion.map((e) => {
    const d = new Date(e.snapshot_date);
    return {
      label: `${MESES[d.getUTCMonth()].slice(0, 3)} ${String(d.getUTCFullYear()).slice(2)}`,
      euros: Number(e.valor_coste), gramos: 0, unidades: Number(e.piezas),
    };
  });

  const stockViejo = aging.filter((a) => a.orden >= 3).reduce((s, a) => s + Number(a.valor_coste), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Valoración y análisis de existencias</p>
        <StockStatusSelector estados={disponibles} seleccion={estados} />
      </div>

      {/* KPIs de valoración */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Piezas en stock" valor={fmtNum(resumen.piezas)} icon={<Boxes className="h-5 w-5" />} acento />
        <KpiCard label="Valor a coste" valor={fmtEur(resumen.valor_coste)} icon={<Euro className="h-5 w-5" />} sub="inmovilizado contable" />
        <KpiCard label="Valor a PVP" valor={fmtEur(resumen.valor_pvp)} icon={<TrendingUp className="h-5 w-5" />} sub="venta potencial" />
        <KpiCard label="Margen latente" valor={fmtPct(margen)} icon={<Layers className="h-5 w-5" />}
          sub={fmtEur(resumen.valor_pvp - resumen.valor_coste)} />
        <KpiCard label="Oro en stock" valor={fmtGramos(resumen.peso_oro)} icon={<Coins className="h-5 w-5" />} />
        <KpiCard label="Plata en stock" valor={fmtGramos(resumen.peso_plata)} icon={<Gem className="h-5 w-5" />} />
      </div>

      {/* Valor del metal a mercado */}
      {metales && (
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 className="font-display text-lg text-slate-800">Valor del metal a precio de mercado</h2>
            <p className="text-xs text-slate-400">
              {fmtGramos(resumen.peso_oro)} oro × {metales.oro.eurGramo.toFixed(2)} €/g +{" "}
              {fmtGramos(resumen.peso_plata)} plata × {metales.plata.eurGramo.toFixed(2)} €/g
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl text-brand-dark">{fmtEur(valorMercadoMetal)}</p>
            <p className="text-xs text-slate-400">
              vs {fmtEur(resumen.valor_coste)} de coste registrado
            </p>
          </div>
        </div>
      )}

      {/* Antigüedad + metal + evolución */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <h2 className="font-display text-lg text-slate-800">Antigüedad del stock</h2>
          <p className="mb-2 text-xs text-slate-400">
            Valor a coste por tramo · inmovilizado &gt;12m: <span className="font-semibold text-amber-600">{fmtEur(stockViejo)}</span>
          </p>
          <BarrasRanking data={agingBars} formato="euro" />
        </div>
        <div className="panel p-5">
          <h2 className="mb-1 font-display text-lg text-slate-800">Reparto por metal</h2>
          <p className="mb-2 text-xs text-slate-400">Valor a coste</p>
          <DonutDistribucion data={metalDim} formato="euro" />
        </div>
        <div className="panel p-5">
          <h2 className="mb-1 font-display text-lg text-slate-800">Evolución de existencias</h2>
          <p className="mb-2 text-xs text-slate-400">Valor a coste por snapshot</p>
          {evolBars.length > 1 ? (
            <AreaTendencia data={evolBars} dataKey="euros" formato="euro" />
          ) : (
            <p className="py-12 text-center text-sm text-slate-400">
              Se necesita más de un snapshot. Cada sincronización guarda una foto mensual.
            </p>
          )}
        </div>
      </div>

      {/* Desglose multidimensional */}
      <StockBreakdown secciones={secciones} />
    </div>
  );
}
