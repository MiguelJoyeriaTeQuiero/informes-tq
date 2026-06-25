"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import type { FilaAnalitica } from "@/lib/queries";
import { fmtEur, fmtEur2, fmtGramos, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SeccionAnalitica {
  key: string;
  label: string;
  filas: FilaAnalitica[];
}

type SortKey = "etiqueta" | "euros" | "unidades" | "ticket" | "gramosOro" | "gramosPlata" | "variacion";

export function AnalyticBreakdown({ secciones }: { secciones: SeccionAnalitica[] }) {
  const [activa, setActiva] = useState(secciones.find((s) => s.filas.length)?.key ?? secciones[0]?.key);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("euros");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const seccion = secciones.find((s) => s.key === activa) ?? secciones[0];

  const filas = useMemo(() => {
    const term = q.trim().toLowerCase();
    const arr = (seccion?.filas ?? []).filter((f) =>
      term ? f.etiqueta.toLowerCase().includes(term) : true
    );
    const dir = sortDir === "asc" ? 1 : -1;
    return [...arr].sort((a, b) => {
      if (sortKey === "etiqueta") return a.etiqueta.localeCompare(b.etiqueta, "es") * dir;
      const va = (a[sortKey] as number) ?? -Infinity;
      const vb = (b[sortKey] as number) ?? -Infinity;
      return (va - vb) * dir;
    });
  }, [seccion, q, sortKey, sortDir]);

  function ordenarPor(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "etiqueta" ? "asc" : "desc");
    }
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
            disabled={!s.filas.length}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              s.key === activa ? "bg-brand-dark text-white" : "text-slate-600 hover:bg-slate-100 disabled:opacity-30"
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
              <Th k="euros">Importe</Th>
              <th className="px-5 py-3 text-left font-medium">% sobre total</th>
              <Th k="unidades">Operac.</Th>
              <Th k="ticket">Ticket medio</Th>
              <Th k="gramosOro">Oro</Th>
              <Th k="gramosPlata">Plata</Th>
              <Th k="variacion">Var. interanual</Th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-5 py-2.5 font-medium text-slate-700">{f.etiqueta}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-right font-medium text-slate-800">{fmtEur(f.euros)}</td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-blue" style={{ width: `${Math.min(100, f.pctEuros * 100).toFixed(1)}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{fmtPct(f.pctEuros)}</span>
                  </div>
                </td>
                <td className="px-5 py-2.5 text-right text-slate-500">{fmtNum(f.unidades)}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-right text-slate-500">{fmtEur2(f.ticket)}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-right text-slate-500">{fmtGramos(f.gramosOro)}</td>
                <td className="whitespace-nowrap px-5 py-2.5 text-right text-slate-500">{fmtGramos(f.gramosPlata)}</td>
                <td className="px-5 py-2.5 text-right">
                  {f.variacion === null ? (
                    <span className="text-xs text-slate-300">—</span>
                  ) : (
                    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", f.variacion >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {f.variacion >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {fmtPct(Math.abs(f.variacion))}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!filas.length && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-400">Sin resultados</td></tr>
            )}
          </tbody>
          {filas.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-100 bg-slate-50/60 font-semibold text-slate-700">
                <td className="px-5 py-3">Total</td>
                <td className="px-5 py-3 text-right">{fmtEur(filas.reduce((s, f) => s + f.euros, 0))}</td>
                <td className="px-5 py-3 text-xs text-slate-400">{fmtPct(filas.reduce((s, f) => s + f.pctEuros, 0))}</td>
                <td className="px-5 py-3 text-right">{fmtNum(filas.reduce((s, f) => s + f.unidades, 0))}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
