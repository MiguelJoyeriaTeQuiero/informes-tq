"use client";

import { useState } from "react";
import type { StockDim } from "@/lib/stock-queries";
import { fmtEur, fmtGramos, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SeccionStock {
  key: string;
  label: string;
  filas: StockDim[];
}

export function StockBreakdown({ secciones }: { secciones: SeccionStock[] }) {
  const [activa, setActiva] = useState(secciones[0]?.key);
  const seccion = secciones.find((s) => s.key === activa) ?? secciones[0];
  const totalCoste = (seccion?.filas ?? []).reduce((s, f) => s + Number(f.valor_coste), 0) || 1;

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 p-3">
        <span className="px-2 text-sm font-medium text-slate-400">Desglose por:</span>
        {secciones.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiva(s.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              s.key === activa ? "bg-brand-dark text-white" : "text-slate-600 hover:bg-slate-100"
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
              <th className="px-5 py-3 text-right font-medium">Piezas</th>
              <th className="px-5 py-3 text-right font-medium">Valor a coste</th>
              <th className="px-5 py-3 font-medium">% del coste</th>
              <th className="px-5 py-3 text-right font-medium">Valor PVP</th>
              <th className="px-5 py-3 text-right font-medium">Margen</th>
              <th className="px-5 py-3 text-right font-medium">Peso</th>
            </tr>
          </thead>
          <tbody>
            {(seccion?.filas ?? []).map((f, i) => {
              const coste = Number(f.valor_coste);
              const pvp = Number(f.valor_pvp);
              const margen = pvp ? (pvp - coste) / pvp : 0;
              return (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-2.5 font-medium text-slate-700">{f.etiqueta}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{fmtNum(f.piezas)}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-slate-800">{fmtEur(coste)}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-blue"
                          style={{ width: `${Math.min(100, (coste / totalCoste) * 100).toFixed(1)}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{fmtPct(coste / totalCoste)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{fmtEur(pvp)}</td>
                  <td className="px-5 py-2.5 text-right font-medium text-emerald-600">{fmtPct(margen)}</td>
                  <td className="px-5 py-2.5 text-right text-slate-500">{fmtGramos(f.peso_g)}</td>
                </tr>
              );
            })}
            {!(seccion?.filas ?? []).length && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
