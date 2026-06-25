"use client";

import { useEffect, useState } from "react";
import { LineComparativa, PALETA } from "./charts";
import { fmtEur, fmtGramos, fmtNum, fmtPct, MESES } from "@/lib/format";
import { OPERACION_LIST } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface AnioData {
  anio: number;
  euros: number;
  unidades: number;
  gramos_oro: number;
  gramos_plata: number;
  meses: { euros: number; unidades: number }[];
}

export function YearComparator({ aniosDisponibles }: { aniosDisponibles: number[] }) {
  const [operacion, setOperacion] = useState<string>("todas");
  const [seleccion, setSeleccion] = useState<number[]>(
    aniosDisponibles.slice(-3)
  );
  const [metrica, setMetrica] = useState<"euros" | "unidades">("euros");
  const [datos, setDatos] = useState<AnioData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!seleccion.length) {
      setDatos([]);
      return;
    }
    setLoading(true);
    fetch(`/api/comparador?operacion=${operacion}&anios=${seleccion.join(",")}`)
      .then((r) => r.json())
      .then((j) => setDatos(j.anios ?? []))
      .catch(() => setDatos([]))
      .finally(() => setLoading(false));
  }, [operacion, seleccion]);

  const ordenados = [...datos].sort((a, b) => a.anio - b.anio);
  const series = ordenados.map((d, i) => ({
    key: String(d.anio),
    color: PALETA[i % PALETA.length],
  }));

  const chartData = MESES.map((m, mi) => {
    const fila: Record<string, any> = { mes: m.slice(0, 3) };
    for (const d of ordenados) fila[String(d.anio)] = d.meses[mi]?.[metrica] ?? 0;
    return fila;
  });

  function toggleAnio(a: number) {
    setSeleccion((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a].sort((x, y) => x - y)
    );
  }

  return (
    <div className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-slate-800">Comparador de años</h2>
          <p className="text-xs text-slate-400">Evolución mensual superpuesta y totales por ejercicio</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={operacion}
            onChange={(e) => setOperacion(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            <option value="todas">Todas las operaciones</option>
            {OPERACION_LIST.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setMetrica("euros")}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition",
                metrica === "euros" ? "bg-white text-brand-dark shadow-sm" : "text-slate-500")}
            >Importe €</button>
            <button
              onClick={() => setMetrica("unidades")}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition",
                metrica === "unidades" ? "bg-white text-brand-dark shadow-sm" : "text-slate-500")}
            >Operaciones</button>
          </div>
        </div>
      </div>

      {/* selector de años */}
      <div className="mb-4 flex flex-wrap gap-2">
        {aniosDisponibles.map((a, i) => {
          const activo = seleccion.includes(a);
          return (
            <button
              key={a}
              onClick={() => toggleAnio(a)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition",
                activo
                  ? "border-transparent text-white"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
              style={activo ? { background: PALETA[ordenados.findIndex((d) => d.anio === a) % PALETA.length] || "#00557F" } : undefined}
            >
              {activo && <span className="h-2 w-2 rounded-full bg-white/80" />}
              {a}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : ordenados.length ? (
        <>
          <LineComparativa data={chartData} series={series} formato={metrica === "euros" ? "euro" : "num"} />

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Año</th>
                  <th className="px-4 py-3 text-right font-medium">Importe</th>
                  <th className="px-4 py-3 text-right font-medium">Var. anual</th>
                  <th className="px-4 py-3 text-right font-medium">Operaciones</th>
                  <th className="px-4 py-3 text-right font-medium">Oro</th>
                  <th className="px-4 py-3 text-right font-medium">Plata</th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map((d, i) => {
                  const prev = ordenados[i - 1];
                  const v = prev && prev.euros ? (d.euros - prev.euros) / Math.abs(prev.euros) : null;
                  return (
                    <tr key={d.anio} className="border-b border-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                          style={{ background: series[i]?.color }} />
                        {d.anio}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-800">{fmtEur(d.euros)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {v === null ? <span className="text-slate-300">—</span> : (
                          <span className={v >= 0 ? "text-emerald-600" : "text-red-500"}>
                            {v >= 0 ? "+" : ""}{fmtPct(v)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{fmtNum(d.unidades)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{fmtGramos(d.gramos_oro)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{fmtGramos(d.gramos_plata)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="py-12 text-center text-sm text-slate-400">Selecciona al menos un año.</p>
      )}
    </div>
  );
}
