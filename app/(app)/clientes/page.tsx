import { clientesResumen, clientesRfm, clientesTop, clientesGeo, clientesEmailList } from "@/lib/clientes-queries";
import { fmtEur, fmtEur2, fmtNum, fmtPct } from "@/lib/format";
import { KpiCard } from "@/components/kpi-card";
import { DonutDistribucion, BarrasRanking } from "@/components/charts";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Users, Repeat, Coins, Mail, Receipt, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const resumen = await clientesResumen();
  if (!resumen.total) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-slate-500">Analítica de clientes (a partir de reservas).</p>
        <EmptyState
          titulo="Sin datos de clientes"
          mensaje="Los datos de cliente provienen de Reservas. Sincroniza las operaciones (Configuración → Sincronizar operaciones) para poblarlos."
          mostrarConfig
        />
      </div>
    );
  }

  const [rfm, top, geo, emails] = await Promise.all([
    clientesRfm(),
    clientesTop(20),
    clientesGeo(),
    clientesEmailList(5000),
  ]);

  const pctRecurrentes = resumen.total ? resumen.recurrentes / resumen.total : 0;
  const rfmDonut = rfm.map((r) => ({ nombre: r.segmento, valor: Number(r.clientes) }));
  const totalRfm = rfm.reduce((s, r) => s + Number(r.clientes), 0) || 1;
  const geoBars = geo.slice(0, 12).map((g) => ({ etiqueta: g.provincia, euros: Number(g.importe), gramos: 0, unidades: Number(g.clientes) }));

  const emailRows = emails.map((e: any) => ({
    Cliente: e.cliente, Email: e.email, Teléfono: e.telefono ?? "", Provincia: e.provincia ?? "",
    "Acepta email": e.email_notif === true ? "Sí" : e.email_notif === false ? "No" : "—",
    "Acepta SMS": e.sms_notif === true ? "Sí" : e.sms_notif === false ? "No" : "—",
    Operaciones: Number(e.operaciones), "Importe (€)": Number(e.importe),
    Última: e.ultima ? new Date(e.ultima).toLocaleDateString("es-ES") : "",
  }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Analítica de clientes · base de reservas</p>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Clientes" valor={fmtNum(resumen.total)} icon={<Users className="h-5 w-5" />} acento />
        <KpiCard label="% Recurrentes" valor={fmtPct(pctRecurrentes)} icon={<Repeat className="h-5 w-5" />} sub={`${fmtNum(resumen.recurrentes)} con +1 operación`} />
        <KpiCard label="LTV medio" valor={fmtEur2(resumen.ltv_medio)} icon={<Coins className="h-5 w-5" />} sub="valor de vida por cliente" />
        <KpiCard label="Ticket medio" valor={fmtEur2(resumen.ticket_medio)} icon={<Receipt className="h-5 w-5" />} />
        <KpiCard label="Con email" valor={fmtNum(resumen.con_email)} icon={<Mail className="h-5 w-5" />} sub="contactables" />
      </div>

      {/* RFM + Geo */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <h2 className="mb-1 font-display text-lg text-slate-800">Segmentación RFM</h2>
          <p className="mb-2 text-xs text-slate-400">Recencia · Frecuencia · Valor monetario</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <DonutDistribucion data={rfmDonut} formato="num" />
            <table className="w-full self-center text-sm">
              <tbody>
                {rfm.map((r) => (
                  <tr key={r.segmento} className="border-b border-slate-50">
                    <td className="py-1.5 font-medium text-slate-700">{r.segmento}</td>
                    <td className="py-1.5 text-right text-slate-500">{fmtNum(r.clientes)}</td>
                    <td className="py-1.5 text-right text-xs text-slate-400">{fmtPct(Number(r.clientes) / totalRfm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-lg text-slate-800"><MapPin className="h-4 w-4 text-brand-dark" /> Distribución geográfica</h2>
          <p className="mb-2 text-xs text-slate-400">Importe de reservas por provincia (top 12)</p>
          <BarrasRanking data={geoBars} formato="euro" />
        </div>
      </div>

      {/* Top clientes */}
      <div className="panel overflow-hidden">
        <h2 className="border-b border-slate-100 p-5 font-display text-lg text-slate-800">Top 20 clientes por valor (LTV)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Provincia</th>
                <th className="px-5 py-3 text-right font-medium">Operaciones</th>
                <th className="px-5 py-3 text-right font-medium">Valor (LTV)</th>
                <th className="px-5 py-3 text-right font-medium">Última</th>
              </tr>
            </thead>
            <tbody>
              {top.map((c, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-2.5 font-medium text-slate-700">{c.cliente}</td>
                  <td className="px-5 py-2.5 text-slate-500">{c.provincia}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{fmtNum(c.frecuencia)}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-slate-800">{fmtEur(c.monetario)}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{c.ultima ? new Date(c.ultima).toLocaleDateString("es-ES") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de email marketing */}
      <div>
        <h2 className="mb-3 font-display text-lg text-slate-800">Lista para email marketing <span className="text-sm font-normal text-slate-400">({fmtNum(emailRows.length)} clientes con email)</span></h2>
        <DataTable rows={emailRows} />
      </div>
    </div>
  );
}
