import { getKpis, getRanking, getRangoFechas, rangoMes } from "@/lib/queries";
import { getObjetivos } from "@/lib/objetivos";
import { getSessionProfile } from "@/lib/auth";
import { MESES } from "@/lib/format";
import { PeriodSelector } from "@/components/period-selector";
import { ObjetivosEditor } from "@/components/objetivos-editor";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function ObjetivosPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const rango = await getRangoFechas();
  if (!rango.max) return <EmptyState />;

  const { profile } = await getSessionProfile();
  const puedeEditar = profile?.role === "admin" || profile?.role === "financiero";

  const ref = new Date(rango.max);
  const anio = sp.anio ? parseInt(sp.anio) : ref.getUTCFullYear();
  const mes = sp.mes ? parseInt(sp.mes) : ref.getUTCMonth();
  const { desde, hasta } = rangoMes(anio, mes);

  const [kpis, ranking, objetivos] = await Promise.all([
    getKpis(desde, hasta),
    getRanking("ventas", "tienda", desde, hasta, 50),
    getObjetivos(anio, mes),
  ]);

  const ventasGlobal = Math.abs(Number(kpis.find((k) => k.operacion === "ventas")?.euros ?? 0));
  const tiendas = ranking.map((r) => ({
    ambito: r.etiqueta,
    etiqueta: r.etiqueta,
    actual: Math.abs(Number(r.euros)),
    objetivo: objetivos[r.etiqueta] ?? 0,
  }));

  const anioMin = rango.min ? new Date(rango.min).getUTCFullYear() : anio;
  const anios = Array.from({ length: anio - anioMin + 1 }, (_, i) => anioMin + i);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Objetivos de facturación · {MESES[mes]} {anio}
          {!puedeEditar && " · (solo lectura)"}
        </p>
        <PeriodSelector anio={anio} mes={mes} anios={anios} />
      </div>

      <ObjetivosEditor
        anio={anio}
        mes={mes}
        puedeEditar={puedeEditar}
        global={{ actual: ventasGlobal, objetivo: objetivos["global"] ?? 0 }}
        tiendas={tiendas}
      />
    </div>
  );
}
