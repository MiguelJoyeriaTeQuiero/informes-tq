"use client";

import { useState, useTransition } from "react";
import { guardarObjetivo } from "@/app/(app)/objetivos/actions";
import { fmtEur, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

const COLOR = {
  verde: "bg-emerald-500", ambar: "bg-amber-400", rojo: "bg-red-500",
} as const;
const COLOR_TXT = {
  verde: "text-emerald-600", ambar: "text-amber-500", rojo: "text-red-500",
} as const;

function sem(pct: number): "verde" | "ambar" | "rojo" {
  if (!isFinite(pct)) return "rojo";
  if (pct >= 1) return "verde";
  if (pct >= 0.8) return "ambar";
  return "rojo";
}

interface Fila { ambito: string; etiqueta: string; actual: number; objetivo: number }

export function ObjetivosEditor({
  anio, mes, puedeEditar, global, tiendas,
}: {
  anio: number; mes: number; puedeEditar: boolean;
  global: { actual: number; objetivo: number };
  tiendas: Fila[];
}) {
  const [pending, start] = useTransition();
  const [valores, setValores] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = { global: global.objetivo };
    for (const t of tiendas) v[t.ambito] = t.objetivo;
    return v;
  });
  const [guardado, setGuardado] = useState<string | null>(null);

  function guardar(ambito: string) {
    start(async () => {
      await guardarObjetivo(anio, mes, ambito, valores[ambito] || 0);
      setGuardado(ambito);
      setTimeout(() => setGuardado(null), 1500);
    });
  }

  const Barra = ({ actual, objetivo }: { actual: number; objetivo: number }) => {
    const pct = objetivo > 0 ? actual / objetivo : 0;
    const s = sem(pct);
    return (
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className={cn("h-full rounded-full", COLOR[s])} style={{ width: `${Math.min(100, pct * 100).toFixed(0)}%` }} />
        </div>
        <span className={cn("w-14 text-right text-sm font-semibold", COLOR_TXT[s])}>
          {objetivo > 0 ? fmtPct(pct) : "—"}
        </span>
      </div>
    );
  };

  const Input = ({ ambito }: { ambito: string }) => (
    <div className="flex items-center gap-1">
      <input
        type="number"
        disabled={!puedeEditar}
        value={valores[ambito] || ""}
        onChange={(e) => setValores((v) => ({ ...v, [ambito]: parseFloat(e.target.value) || 0 }))}
        onBlur={() => puedeEditar && guardar(ambito)}
        placeholder="0"
        className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm outline-none focus:border-brand-blue disabled:bg-slate-50 disabled:text-slate-400"
      />
      <span className="w-4">
        {guardado === ambito && <Check className="h-4 w-4 text-emerald-500" />}
        {pending && guardado !== ambito && <span className="inline-block w-4" />}
      </span>
    </div>
  );

  const pctGlobal = valores.global > 0 ? global.actual / valores.global : 0;
  const sGlobal = sem(pctGlobal);

  return (
    <div className="space-y-6">
      {/* Objetivo global del mes */}
      <div className={cn("panel p-6", sGlobal === "verde" && "ring-1 ring-emerald-200")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Objetivo de facturación del mes (global)</p>
            <p className="mt-1 font-display text-3xl text-slate-900">{fmtEur(global.actual)}</p>
            <p className="text-xs text-slate-400">
              de un objetivo de {fmtEur(valores.global || 0)}
            </p>
          </div>
          <div className="text-right">
            <span className={cn("inline-flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white", COLOR[sGlobal])}>
              {valores.global > 0 ? fmtPct(pctGlobal) : "—"}
            </span>
          </div>
        </div>
        <div className="mt-4"><Barra actual={global.actual} objetivo={valores.global || 0} /></div>
        {puedeEditar && (
          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-500">Fijar objetivo global:</span>
            <Input ambito="global" />
            {pending && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          </div>
        )}
      </div>

      {/* Por tienda */}
      <div className="panel overflow-hidden">
        <h2 className="border-b border-slate-100 p-5 font-display text-lg text-slate-800">Objetivos por tienda</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Tienda</th>
                <th className="px-5 py-3 text-right font-medium">Facturación</th>
                <th className="px-5 py-3 text-right font-medium">Objetivo</th>
                <th className="px-5 py-3 font-medium">Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {tiendas.map((t) => (
                <tr key={t.ambito} className="border-b border-slate-50">
                  <td className="px-5 py-2.5 font-medium text-slate-700">{t.etiqueta}</td>
                  <td className="px-5 py-2.5 text-right text-slate-700">{fmtEur(t.actual)}</td>
                  <td className="px-5 py-2.5 text-right">
                    {puedeEditar ? <div className="flex justify-end"><Input ambito={t.ambito} /></div>
                      : <span className="text-slate-500">{fmtEur(valores[t.ambito] || 0)}</span>}
                  </td>
                  <td className="px-5 py-2.5" style={{ minWidth: 180 }}><Barra actual={t.actual} objetivo={valores[t.ambito] || 0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
