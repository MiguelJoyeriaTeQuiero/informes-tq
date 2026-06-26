"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SeccionCompras {
  key: string;
  label: string;
  filas: { etiqueta: string; valor: number; filas: number }[];
}

export function ComprasBreakdown({
  secciones,
  metricaLabel,
}: {
  secciones: SeccionCompras[];
  metricaLabel: string;
}) {
  const [activa, setActiva] = useState(secciones[0]?.key);
  const [q, setQ] = useState("");
  const seccion = secciones.find((s) => s.key === activa) ?? secciones[0];

  const filas = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (seccion?.filas ?? []).filter((f) => (term ? f.etiqueta.toLowerCase().includes(term) : true));
  }, [seccion, q]);
  const totalValor = (seccion?.filas ?? []).reduce((s, f) => s + Math.abs(f.valor), 0) || 1;

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <span className="px-2 text-sm font-medium text-slate-400">Desglose por:</span>
        {secciones.map((s) => (
          <button key={s.key} onClick={() => setActiva(s.key)}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition",
              s.key === activa ? "bg-brand-dark text-white" : "text-slate-600 hover:bg-slate-100")}>
            {s.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
            className="w-44 rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-brand-blue" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">{seccion?.label}</th>
              <th className="px-5 py-3 text-right font-medium">{metricaLabel}</th>
              <th className="px-5 py-3 font-medium">% del total</th>
              <th className="px-5 py-3 text-right font-medium">Filas</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-5 py-2.5 font-medium text-slate-700">{f.etiqueta}</td>
                <td className="px-5 py-2.5 text-right font-medium text-slate-800">{fmtNum(f.valor)}</td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-blue" style={{ width: `${Math.min(100, (Math.abs(f.valor) / totalValor) * 100).toFixed(1)}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{((Math.abs(f.valor) / totalValor) * 100).toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-5 py-2.5 text-right text-slate-500">{fmtNum(f.filas)}</td>
              </tr>
            ))}
            {!filas.length && <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">Sin datos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
