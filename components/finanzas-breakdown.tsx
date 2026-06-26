"use client";

import { useMemo, useState } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { RentDesgloseRow } from "@/lib/finanzas-queries";
import { fmtEur, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SeccionFinanzas {
  key: string;
  label: string;
  filas: RentDesgloseRow[];
}
type SortKey = "etiqueta" | "ingresos" | "coste" | "margen" | "margenPct" | "unidades";

export function FinanzasBreakdown({ secciones }: { secciones: SeccionFinanzas[] }) {
  const [activa, setActiva] = useState(secciones[0]?.key);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("margen");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const seccion = secciones.find((s) => s.key === activa) ?? secciones[0];

  const filas = useMemo(() => {
    const term = q.trim().toLowerCase();
    const arr = (seccion?.filas ?? [])
      .filter((f) => (term ? f.etiqueta.toLowerCase().includes(term) : true))
      .map((f) => ({ ...f, margenPct: f.ingresos ? f.margen / f.ingresos : 0 }));
    const dir = sortDir === "asc" ? 1 : -1;
    return arr.sort((a, b) => {
      if (sortKey === "etiqueta") return a.etiqueta.localeCompare(b.etiqueta, "es") * dir;
      return (((a as any)[sortKey] ?? 0) - ((b as any)[sortKey] ?? 0)) * dir;
    });
  }, [seccion, q, sortKey, sortDir]);

  function ordenar(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "etiqueta" ? "asc" : "desc"); }
  }
  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th className="px-5 py-3 text-right font-medium">
      <button onClick={() => ordenar(k)} className="inline-flex flex-row-reverse items-center gap-1 hover:text-slate-700">
        {children}
        {sortKey === k ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-brand-blue" /> : <ArrowDown className="h-3 w-3 text-brand-blue" />) : <ArrowUpDown className="h-3 w-3 text-slate-300" />}
      </button>
    </th>
  );

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <span className="px-2 text-sm font-medium text-slate-400">Margen por:</span>
        {secciones.map((s) => (
          <button key={s.key} onClick={() => setActiva(s.key)}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition", s.key === activa ? "bg-brand-dark text-white" : "text-slate-600 hover:bg-slate-100")}>
            {s.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="w-44 rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-brand-blue" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 text-left font-medium">{seccion?.label}</th>
              <Th k="ingresos">Ingresos</Th>
              <Th k="coste">Coste</Th>
              <Th k="margen">Margen €</Th>
              <Th k="margenPct">Margen %</Th>
              <Th k="unidades">Unidades</Th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-5 py-2.5 font-medium text-slate-700">{f.etiqueta}</td>
                <td className="px-5 py-2.5 text-right text-slate-600">{fmtEur(f.ingresos)}</td>
                <td className="px-5 py-2.5 text-right text-slate-500">{fmtEur(f.coste)}</td>
                <td className="px-5 py-2.5 text-right font-medium text-slate-800">{fmtEur(f.margen)}</td>
                <td className={cn("px-5 py-2.5 text-right font-medium", f.margenPct >= 0 ? "text-emerald-600" : "text-red-500")}>{fmtPct(f.margenPct)}</td>
                <td className="px-5 py-2.5 text-right text-slate-500">{fmtNum(f.unidades)}</td>
              </tr>
            ))}
            {!filas.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Sin datos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
