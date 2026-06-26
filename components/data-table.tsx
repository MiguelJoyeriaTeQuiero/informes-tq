"use client";

import { useMemo, useState } from "react";
import { Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGINA = 200;
const numFmt = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

function esNumero(v: unknown) {
  return v !== "" && v !== null && v !== undefined && !Number.isNaN(Number(v));
}

export function DataTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columnas = useMemo(() => (rows.length ? Object.keys(rows[0]) : []), [rows]);
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [limite, setLimite] = useState(PAGINA);

  // columnas numéricas (para alinear a la derecha)
  const numericas = useMemo(() => {
    const set = new Set<string>();
    for (const c of columnas) {
      const muestra = rows.slice(0, 30).map((r) => r[c]).filter((v) => v !== "" && v != null);
      if (muestra.length && muestra.every(esNumero)) set.add(c);
    }
    return set;
  }, [columnas, rows]);

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    let arr = rows;
    if (term) arr = rows.filter((r) => columnas.some((c) => String(r[c] ?? "").toLowerCase().includes(term)));
    if (sortCol) {
      const dir = sortDir === "asc" ? 1 : -1;
      const num = numericas.has(sortCol);
      arr = [...arr].sort((a, b) => {
        const va = a[sortCol], vb = b[sortCol];
        if (num) return (Number(va || 0) - Number(vb || 0)) * dir;
        return String(va ?? "").localeCompare(String(vb ?? ""), "es") * dir;
      });
    }
    return arr;
  }, [rows, columnas, q, sortCol, sortDir, numericas]);

  function ordenar(c: string) {
    if (sortCol === c) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(c); setSortDir(numericas.has(c) ? "desc" : "asc"); }
  }

  function exportar() {
    const csv = [columnas, ...filtradas.map((r) => columnas.map((c) => r[c]))]
      .map((f) => f.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "informe.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3">
        <p className="px-2 text-sm text-slate-400">
          {filtradas.length.toLocaleString("es-ES")} de {rows.length.toLocaleString("es-ES")} filas
        </p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
              className="w-44 rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-brand-blue" />
          </div>
          <button onClick={exportar} className="btn-ghost border border-slate-200"><Download className="h-4 w-4" /> CSV</button>
        </div>
      </div>
      <div className="max-h-[640px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              {columnas.map((c) => (
                <th key={c} className={cn("whitespace-nowrap px-4 py-3 font-medium", numericas.has(c) ? "text-right" : "text-left")}>
                  <button onClick={() => ordenar(c)} className={cn("inline-flex items-center gap-1 hover:text-slate-700", numericas.has(c) && "flex-row-reverse")}>
                    {c}
                    {sortCol === c ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-brand-blue" /> : <ArrowDown className="h-3 w-3 text-brand-blue" />) : <ArrowUpDown className="h-3 w-3 text-slate-300" />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtradas.slice(0, limite).map((r, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                {columnas.map((c) => (
                  <td key={c} className={cn("whitespace-nowrap px-4 py-2", numericas.has(c) ? "text-right text-slate-700" : "text-slate-600")}>
                    {numericas.has(c) && r[c] != null && r[c] !== "" ? numFmt.format(Number(r[c])) : String(r[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
            {!filtradas.length && <tr><td colSpan={columnas.length || 1} className="px-4 py-10 text-center text-slate-400">Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
      {filtradas.length > limite && (
        <div className="border-t border-slate-100 p-3 text-center">
          <button onClick={() => setLimite((l) => l + PAGINA)} className="btn-ghost">
            Mostrar más ({(filtradas.length - limite).toLocaleString("es-ES")} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
