"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { LineComparativa, PALETA } from "./charts";
import { fmtEur, fmtGramos, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

type Metrica = "euros" | "unidades" | "gramos";
interface TiendaSerie {
  tienda: string; euros: number[]; gramos: number[]; unidades: number[];
  total: { euros: number; gramos: number; unidades: number };
}

export function TiendaComparator({ operacion, tiendas }: { operacion: string; tiendas: string[] }) {
  const [seleccion, setSeleccion] = useState<string[]>(() => tiendas.slice(0, 3));
  const [metrica, setMetrica] = useState<Metrica>("euros");
  const [datos, setDatos] = useState<{ meses: string[]; tiendas: TiendaSerie[] }>({ meses: [], tiendas: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!seleccion.length) { setDatos({ meses: [], tiendas: [] }); return; }
    setLoading(true);
    fetch(`/api/comparador-tiendas?operacion=${operacion}&tiendas=${encodeURIComponent(seleccion.join(","))}`)
      .then((r) => r.json())
      .then((j) => setDatos({ meses: j.meses ?? [], tiendas: j.tiendas ?? [] }))
      .catch(() => setDatos({ meses: [], tiendas: [] }))
      .finally(() => setLoading(false));
  }, [operacion, seleccion]);

  function toggle(t: string) {
    setSeleccion((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 8 ? [...prev, t] : prev));
  }

  const series = datos.tiendas.map((t, i) => ({ key: t.tienda, color: PALETA[i % PALETA.length] }));
  const chartData = datos.meses.map((mes, mi) => {
    const fila: Record<string, any> = { mes };
    for (const t of datos.tiendas) fila[t.tienda] = (t as any)[metrica][mi] ?? 0;
    return fila;
  });
  const fmt = metrica === "euros" ? fmtEur : metrica === "gramos" ? fmtGramos : fmtNum;

  return (
    <div className="panel p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-slate-800">Comparativa de tiendas</h2>
          <p className="text-xs text-slate-400">Evolución mensual superpuesta (12 meses) · máx. 8 tiendas</p>
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {([["euros", "Importe €"], ["unidades", "Operaciones"], ["gramos", "Gramos"]] as [Metrica, string][]).map(([m, l]) => (
            <button key={m} onClick={() => setMetrica(m)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition", metrica === m ? "bg-white text-brand-dark shadow-sm" : "text-slate-500")}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tiendas.map((t) => {
          const idx = datos.tiendas.findIndex((d) => d.tienda === t);
          const activo = seleccion.includes(t);
          return (
            <button key={t} onClick={() => toggle(t)}
              className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition",
                activo ? "border-transparent text-white" : "border-slate-200 text-slate-500 hover:bg-slate-50")}
              style={activo && idx >= 0 ? { background: PALETA[idx % PALETA.length] } : undefined}>
              {activo && <span className="h-2 w-2 rounded-full bg-white/80" />}
              {t}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-72 items-center justify-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : datos.tiendas.length ? (
        <>
          <LineComparativa data={chartData} series={series} formato={metrica === "euros" ? "euro" : "num"} />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Tienda</th>
                  <th className="px-4 py-3 text-right font-medium">Importe (12m)</th>
                  <th className="px-4 py-3 text-right font-medium">Operaciones</th>
                  <th className="px-4 py-3 text-right font-medium">Gramos</th>
                </tr>
              </thead>
              <tbody>
                {datos.tiendas.map((t, i) => (
                  <tr key={t.tienda} className="border-b border-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: series[i]?.color }} />
                      {t.tienda}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-800">{fmtEur(t.total.euros)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{fmtNum(t.total.unidades)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500">{fmtGramos(t.total.gramos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="py-12 text-center text-sm text-slate-400">Selecciona al menos una tienda.</p>
      )}
    </div>
  );
}
