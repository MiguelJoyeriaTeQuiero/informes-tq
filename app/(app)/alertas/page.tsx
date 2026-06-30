import Link from "next/link";
import { getAlertas } from "@/lib/alertas";
import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const ESTILO = {
  rojo: { card: "border-red-200 bg-red-50", icon: <AlertCircle className="h-5 w-5 text-red-500" />, txt: "text-red-700" },
  ambar: { card: "border-amber-200 bg-amber-50", icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, txt: "text-amber-700" },
  info: { card: "border-slate-200 bg-slate-50", icon: <Info className="h-5 w-5 text-slate-400" />, txt: "text-slate-600" },
} as const;

export default async function AlertasPage() {
  const alertas = await getAlertas();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-sm text-slate-500">
        La app revisa tus datos y te avisa de lo que requiere atención. Se actualiza con cada sincronización.
      </p>

      {!alertas.length ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h3 className="font-display text-lg text-slate-800">Todo en orden</h3>
          <p className="max-w-md text-sm text-slate-500">No hay alertas activas en este momento.</p>
        </div>
      ) : (
        alertas.map((a, i) => {
          const e = ESTILO[a.nivel];
          return (
            <Link key={i} href={a.href} className="group block">
              <div className={cn("flex items-start gap-4 rounded-2xl border p-5 transition group-hover:shadow-card", e.card)}>
                <span className="mt-0.5 shrink-0">{e.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-display text-base", e.txt)}>{a.titulo}</p>
                  <p className="mt-1 text-sm text-slate-600">{a.detalle}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
