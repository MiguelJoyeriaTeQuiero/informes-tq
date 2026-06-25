"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { FilaAnalitica } from "@/lib/queries";
import { fmtEur, fmtEur2, fmtGramos, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SeccionAnalitica {
  key: string;
  label: string;
  filas: FilaAnalitica[];
}

export function AnalyticBreakdown({ secciones }: { secciones: SeccionAnalitica[] }) {
  const disponibles = secciones.filter((s) => s.filas.length > 0);
  const [activa, setActiva] = useState(disponibles[0]?.key ?? secciones[0]?.key);
  const seccion = secciones.find((s) => s.key === activa) ?? secciones[0];

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 p-3">
        <span className="px-2 text-sm font-medium text-slate-400">Desglose por:</span>
        {secciones.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiva(s.key)}
            disabled={!s.filas.length}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              s.key === activa
                ? "bg-brand-dark text-white"
                : "text-slate-600 hover:bg-slate-100 disabled:opacity-30"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">{seccion?.label}</th>
              <th className="px-5 py-3 text-right font-medium">Importe</th>
              <th className="px-5 py-3 font-medium">% sobre total</th>
              <th className="px-5 py-3 text-right font-medium">Operac.</th>
              <th className="px-5 py-3 text-right font-medium">Ticket medio</th>
              <th className="px-5 py-3 text-right font-medium">Oro</th>
              <th className="px-5 py-3 text-right font-medium">Plata</th>
              <th className="px-5 py-3 text-right font-medium">Var. interanual</th>
            </tr>
          </thead>
          <tbody>
            {(seccion?.filas ?? []).map((f, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-5 py-2.5 font-medium text-slate-700">{f.etiqueta}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-right font-medium text-slate-800">
                  {fmtEur(f.euros)}
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-blue"
                        style={{ width: `${Math.min(100, f.pctEuros * 100).toFixed(1)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{fmtPct(f.pctEuros)}</span>
                  </div>
                </td>
                <td className="px-5 py-2.5 text-right text-slate-500">{fmtNum(f.unidades)}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-right text-slate-500">
                  {fmtEur2(f.ticket)}
                </td>
                <td className="whitespace-nowrap px-5 py-2.5 text-right text-slate-500">
                  {fmtGramos(f.gramosOro)}
                </td>
                <td className="whitespace-nowrap px-5 py-2.5 text-right text-slate-500">
                  {fmtGramos(f.gramosPlata)}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {f.variacion === null ? (
                    <span className="text-xs text-slate-300">—</span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-xs font-medium",
                        f.variacion >= 0 ? "text-emerald-600" : "text-red-500"
                      )}
                    >
                      {f.variacion >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {fmtPct(Math.abs(f.variacion))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!(seccion?.filas ?? []).length && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                  Sin datos en el periodo
                </td>
              </tr>
            )}
          </tbody>
          {(seccion?.filas ?? []).length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-100 bg-slate-50/60 font-semibold text-slate-700">
                <td className="px-5 py-3">Total</td>
                <td className="px-5 py-3 text-right">
                  {fmtEur(seccion!.filas.reduce((s, f) => s + f.euros, 0))}
                </td>
                <td className="px-5 py-3 text-xs text-slate-400">100%</td>
                <td className="px-5 py-3 text-right">
                  {fmtNum(seccion!.filas.reduce((s, f) => s + f.unidades, 0))}
                </td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
