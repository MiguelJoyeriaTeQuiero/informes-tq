"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import type { StockDim } from "@/lib/stock-queries";
import { fmtEur, fmtGramos, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SeccionStock {
  key: string;
  label: string;
  filas: StockDim[];
}

type SortKey = "etiqueta" | "piezas" | "valor_coste" | "valor_pvp" | "peso_g";

export function StockBreakdown({ secciones }: { secciones: SeccionStock[] }) {
  const [activa, setActiva] = useState(secciones[0]?.key);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("valor_coste");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const seccion = secciones.find((s) => s.key === activa) ?? secciones[0];
  const totalCoste = (seccion?.filas ?? []).reduce((s, f) => s + Number(f.valor_coste), 0) || 1;

  const filas = useMemo(() => {
    const term = q.trim().toLowerCase();
    const arr = (seccion?.filas ?? []).filter((f) => (term ? f.etiqueta.toLowerCase().includes(term) : true));
    const dir = sortDir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (sortKey === "etiqueta") return a.etiqueta.localeCompare(b.etiqueta, "es") * dir;
      return (Number(a[sortKey]) - Number(b[sortKey])) * dir;
    });
  }, [seccion, q, sortKey, sortDir]);

  function ordenarPor(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "etiqueta" ? "asc" : "desc"); }
  }

  const Th = ({ k, children, alinear = "right" }: { k: SortKey; children: React.ReactNode; alinear?: "left" | "right" }) => (
    <th className={cn("px-5 py-3 font-medium", alinear === "right" ? "text-right" : "text-left")}>
      <button onClick={() => ordenarPor(k)} className={cn("inline-flex items-center gap-1 hover:text-slate-700", alinear === "right" && "flex-row-reverse")}>
        {children}
        {sortKey === k ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-brand-blue" /> : <ArrowDown className="h-3 w-3 text-brand-blue" />
        ) : (
          <ArrowUpDown className="h-3 w-3 text-slate-300" />
        )}
      </button>
    </th>
  );

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
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
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="w-44 rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-brand-blue"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              <Th k="etiqueta" alinear="left">{seccion?.label}</Th>
              <Th k="piezas">Piezas</Th>
              <Th k="valor_coste">Valor a coste</Th>
              <th className="px-5 py-3 text-left font-medium">% del coste</th>
              <Th k="valor_pvp">Valor PVP</Th>
              <th className="px-5 py-3 text-right font-medium">Margen</th>
              <Th k="peso_g">Peso</Th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
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
                        <div className="h-full rounded-full bg-brand-blue" style={{ width: `${Math.min(100, (coste / totalCoste) * 100).toFixed(1)}%` }} />
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
            {!filas.length && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
