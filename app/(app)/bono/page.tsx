import { getBonoBase, getBonoConfig, rangoTrimestre } from "@/lib/extras-queries";
import { getRangoFechas } from "@/lib/queries";
import { getSessionProfile } from "@/lib/auth";
import { fmtEur, fmtGramos, fmtNum } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { TrimestreSelector } from "@/components/trimestre-selector";
import { BonoConfigEditor } from "@/components/bono-config-editor";
import { EmptyState } from "@/components/empty-state";
import { Award, Coins, Gem } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BonoPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; t?: string }>;
}) {
  const sp = await searchParams;
  const rango = await getRangoFechas();
  if (!rango.max) return <EmptyState />;

  const { profile } = await getSessionProfile();
  const puedeEditar = profile?.role === "admin" || profile?.role === "financiero";

  const ref = new Date(rango.max);
  const anio = sp.anio ? parseInt(sp.anio) : ref.getUTCFullYear();
  const trimestre = sp.t ? parseInt(sp.t) : Math.floor(ref.getUTCMonth() / 3) + 1;
  const { desde, hasta } = rangoTrimestre(anio, trimestre);

  const [base, config] = await Promise.all([getBonoBase(desde, hasta), getBonoConfig()]);

  const filas = base
    .map((f) => ({
      ...f,
      bono: Number(f.oro_g) * config.eur_g_oro + Number(f.plata_g) * config.eur_g_plata,
    }))
    .sort((a, b) => b.bono - a.bono);

  const totalBono = filas.reduce((s, f) => s + f.bono, 0);
  const totalOro = filas.reduce((s, f) => s + Number(f.oro_g), 0);
  const totalPlata = filas.reduce((s, f) => s + Number(f.plata_g), 0);

  const anioMin = rango.min ? new Date(rango.min).getUTCFullYear() : anio;
  const anios = Array.from({ length: anio - anioMin + 1 }, (_, i) => anioMin + i);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Bono variable por tienda · {trimestre}º trimestre {anio}</p>
        <TrimestreSelector anio={anio} trimestre={trimestre} anios={anios} />
      </div>

      <BonoConfigEditor oro={config.eur_g_oro} plata={config.eur_g_plata} puedeEditar={puedeEditar} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Bono total del trimestre" valor={fmtEur(totalBono)} icon={<Award className="h-5 w-5" />} acento />
        <KpiCard label="Oro vendido (total)" valor={fmtGramos(totalOro)} icon={<Coins className="h-5 w-5" />} />
        <KpiCard label="Plata vendida (total)" valor={fmtGramos(totalPlata)} icon={<Gem className="h-5 w-5" />} />
        <KpiCard label="Tiendas" valor={fmtNum(filas.length)} />
      </div>

      <div className="panel overflow-hidden">
        <h2 className="border-b border-slate-100 p-5 font-display text-lg text-slate-800">Bono por tienda</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Tienda</th>
                <th className="px-5 py-3 text-right font-medium">Oro</th>
                <th className="px-5 py-3 text-right font-medium">Plata</th>
                <th className="px-5 py-3 text-right font-medium">Oro nuevo</th>
                <th className="px-5 py-3 text-right font-medium">Oro ocasión</th>
                <th className="px-5 py-3 text-right font-medium">Ventas</th>
                <th className="px-5 py-3 text-right font-medium">Bono</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-2.5 font-medium text-slate-700">{f.tienda}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{fmtGramos(f.oro_g)}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{fmtGramos(f.plata_g)}</td>
                  <td className="px-5 py-2.5 text-right text-slate-400">{fmtGramos(f.oro_nuevo_g)}</td>
                  <td className="px-5 py-2.5 text-right text-slate-400">{fmtGramos(f.oro_ocasion_g)}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{fmtEur(f.importe)}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-brand-dark">{fmtEur(f.bono)}</td>
                </tr>
              ))}
              {!filas.length && <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Sin ventas en el trimestre</td></tr>}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-100 bg-slate-50/60 font-semibold text-slate-700">
                <td className="px-5 py-3">Total</td>
                <td className="px-5 py-3 text-right">{fmtGramos(totalOro)}</td>
                <td className="px-5 py-3 text-right">{fmtGramos(totalPlata)}</td>
                <td colSpan={3} />
                <td className="px-5 py-3 text-right text-brand-dark">{fmtEur(totalBono)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
