import Link from "next/link";
import { REPORTES_COMPRAS } from "@/lib/compras-config";
import { comprasTotal, comprasSum } from "@/lib/compras-queries";
import { fmtNum } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import { ArrowRight, FileBarChart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AprovisionamientoPage() {
  const datos = await Promise.all(
    REPORTES_COMPRAS.map(async (r) => ({
      ...r,
      total: await comprasTotal(r.key),
      metricaSum: await comprasSum(r.key, r.metrica),
    }))
  );

  const hayDatos = datos.some((d) => d.total > 0);
  if (!hayDatos) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500">Informes operativos del Departamento de Compras.</p>
        <EmptyState
          titulo="Informes de compras sin cargar"
          mensaje="Ejecuta la sincronización del Departamento de Compras: npm run sync:compras (carga inicial) o el botón 'Sincronizar Compras' en Configuración."
        />
      </div>
    );
  }

  const grupos = [...new Set(REPORTES_COMPRAS.map((r) => r.grupo))];

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-500">
        Informes operativos del Departamento de Compras · datos sincronizados desde Metabase
      </p>

      {grupos.map((grupo) => (
        <div key={grupo} className="space-y-3">
          <h2 className="font-display text-lg text-slate-800">{grupo}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {datos.filter((d) => d.grupo === grupo).map((d) => (
              <Link key={d.key} href={`/aprovisionamiento/${d.key}`} className="group block">
                <div className="kpi-card h-full transition group-hover:shadow-glow">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-sand text-brand-dark">
                      <FileBarChart className="h-5 w-5" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-blue" />
                  </div>
                  <p className="mt-3 font-medium text-slate-800">{d.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{d.descripcion}</p>
                  <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">{d.kpis[0]?.label ?? d.metrica}</p>
                      <p className="font-display text-xl text-brand-dark">{fmtNum(d.metricaSum)}</p>
                    </div>
                    <p className="text-xs text-slate-400">{fmtNum(d.total)} filas</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
