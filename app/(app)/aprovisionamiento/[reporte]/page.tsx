import Link from "next/link";
import { notFound } from "next/navigation";
import { REPORTE_BY_KEY } from "@/lib/compras-config";
import { comprasTotal, comprasSum, comprasDesglose, comprasConteo, comprasFilas } from "@/lib/compras-queries";
import { fmtNum } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { ComprasBreakdown } from "@/components/compras-breakdown";
import { DataTable } from "@/components/data-table";
import { ArrowLeft, Boxes, Hash } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReporteComprasPage({
  params,
}: {
  params: Promise<{ reporte: string }>;
}) {
  const { reporte } = await params;
  const cfg = REPORTE_BY_KEY[reporte];
  if (!cfg) notFound();

  const [total, kpiSums, estados, desgloses, filas] = await Promise.all([
    comprasTotal(cfg.key),
    Promise.all(cfg.kpis.map((k) => comprasSum(cfg.key, k.col))),
    cfg.estadoCol ? comprasConteo(cfg.key, cfg.estadoCol) : Promise.resolve([]),
    Promise.all(cfg.dims.map((d) => comprasDesglose(cfg.key, d, cfg.metrica))),
    comprasFilas(cfg.key),
  ]);

  const secciones = cfg.dims.map((d, i) => ({ key: d, label: d, filas: desgloses[i] }));
  const metricaLabel = cfg.kpis.find((k) => k.col === cfg.metrica)?.label ?? cfg.metrica;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/aprovisionamiento" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand-blue">
            <ArrowLeft className="h-3 w-3" /> Departamento de Compras
          </Link>
          <h2 className="mt-1 font-display text-xl text-slate-900">{cfg.label}</h2>
          <p className="text-sm text-slate-500">{cfg.descripcion}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Registros" valor={fmtNum(total)} icon={<Hash className="h-5 w-5" />} acento />
        {cfg.kpis.map((k, i) => (
          <KpiCard key={k.col} label={k.label} valor={fmtNum(kpiSums[i])} icon={<Boxes className="h-5 w-5" />} />
        ))}
      </div>

      {/* Reparto por estado */}
      {estados.length > 0 && (
        <div className="panel p-5">
          <h3 className="mb-3 font-display text-lg text-slate-800">Por estado</h3>
          <div className="flex flex-wrap gap-2">
            {estados.map((e) => (
              <span key={e.etiqueta} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm">
                <span className="font-medium text-slate-700">{e.etiqueta}</span>
                <span className="rounded-full bg-brand-sand px-2 py-0.5 text-xs font-semibold text-brand-dark">{fmtNum(e.filas)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Desgloses */}
      <ComprasBreakdown secciones={secciones} metricaLabel={metricaLabel} />

      {/* Tabla completa */}
      <DataTable rows={filas} />
    </div>
  );
}
