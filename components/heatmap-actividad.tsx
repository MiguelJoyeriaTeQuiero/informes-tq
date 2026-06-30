"use client";

import { useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { fmtEur, fmtEur2, fmtNum, fmtGramos } from "@/lib/format";
import { cn } from "@/lib/utils";

type Metrica = "unidades" | "euros" | "oro" | "plata" | "ambos";

interface Celda {
  tienda: string;
  dow: number;
  hora: number;
  euros: number;
  unidades: number;
  gramos_oro: number;
  gramos_plata: number;
}

const DIAS = [
  { dow: 1, label: "Lun" }, { dow: 2, label: "Mar" }, { dow: 3, label: "Mié" },
  { dow: 4, label: "Jue" }, { dow: 5, label: "Vie" }, { dow: 6, label: "Sáb" },
  { dow: 0, label: "Dom" },
];
const TODAS = "__todas__";

function color(t: number) {
  const a = [238, 246, 251];
  const b = [0, 85, 127];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

interface MovCelda {
  fecha: string; codigo: string; descripcion: string; familia: string;
  empleado: string; tienda: string; peso: number; importe: number;
}

export function HeatmapActividad({
  data, operacion, tiendaPagina,
}: {
  data: Celda[];
  operacion: string;
  tiendaPagina?: string | null;
}) {
  const [metrica, setMetrica] = useState<Metrica>("unidades");
  const [tienda, setTienda] = useState<string>(TODAS);
  const [sel, setSel] = useState<{ dow: number; hora: number } | null>(null);
  const [detalle, setDetalle] = useState<MovCelda[]>([]);
  const [cargando, setCargando] = useState(false);

  function abrirCelda(dow: number, hora: number) {
    const tiendaEf = tienda !== TODAS ? tienda : tiendaPagina ?? "";
    setSel({ dow, hora });
    setDetalle([]);
    setCargando(true);
    const params = new URLSearchParams({ operacion, dow: String(dow), hora: String(hora) });
    if (tiendaEf) params.set("tienda", tiendaEf);
    fetch(`/api/celda?${params}`)
      .then((r) => r.json())
      .then((j) => setDetalle(j.filas ?? []))
      .catch(() => setDetalle([]))
      .finally(() => setCargando(false));
  }

  const valorDe = (c: { euros: number; unidades: number; gramos_oro: number; gramos_plata: number }) =>
    metrica === "euros" ? Math.abs(c.euros)
    : metrica === "oro" ? c.gramos_oro
    : metrica === "plata" ? c.gramos_plata
    : metrica === "ambos" ? c.gramos_oro + c.gramos_plata
    : c.unidades;

  const tiendas = useMemo(
    () => [...new Set(data.map((c) => c.tienda).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [data]
  );

  // Agrega por (dow,hora) según la tienda seleccionada (o todas)
  const { mapa, horas, max, pico } = useMemo(() => {
    const agg = new Map<string, { dow: number; hora: number; euros: number; unidades: number; gramos_oro: number; gramos_plata: number }>();
    for (const c of data) {
      if (tienda !== TODAS && c.tienda !== tienda) continue;
      const key = `${c.dow}-${c.hora}`;
      const cur = agg.get(key) ?? { dow: c.dow, hora: c.hora, euros: 0, unidades: 0, gramos_oro: 0, gramos_plata: 0 };
      cur.euros += Number(c.euros);
      cur.unidades += Number(c.unidades);
      cur.gramos_oro += Number(c.gramos_oro ?? 0);
      cur.gramos_plata += Number(c.gramos_plata ?? 0);
      agg.set(key, cur);
    }
    let hMin = 23, hMax = 0, max = 0;
    let pico: { dow: number; hora: number; euros: number; unidades: number; gramos_oro: number; gramos_plata: number } | null = null;
    for (const c of agg.values()) {
      if (c.unidades > 0) { hMin = Math.min(hMin, c.hora); hMax = Math.max(hMax, c.hora); }
      const v = valorDe(c);
      if (v > max) max = v;
      if (v > (pico ? valorDe(pico) : -1)) pico = c;
    }
    if (hMin > hMax) { hMin = 9; hMax = 21; }
    const horas = Array.from({ length: hMax - hMin + 1 }, (_, i) => hMin + i);
    return { mapa: agg, horas, max: max || 1, pico };
  }, [data, metrica, tienda]);

  const fmt = metrica === "euros" ? fmtEur : metrica === "unidades" ? fmtNum : fmtGramos;
  const labelDia = (dow: number) => DIAS.find((d) => d.dow === dow)?.label ?? "";

  return (
    <div className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-slate-800">Mapa de calor de actividad</h2>
          <p className="text-xs text-slate-400">
            Día de la semana × hora (local Canarias) · patrón de los últimos 12 meses
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={tienda}
            onChange={(e) => setTienda(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-brand-blue"
          >
            <option value={TODAS}>Todas las tiendas</option>
            {tiendas.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex rounded-xl bg-slate-100 p-1">
            {([["unidades", "Operaciones"], ["euros", "Importe €"], ["oro", "Oro (g)"], ["plata", "Plata (g)"], ["ambos", "Ambos (g)"]] as [Metrica, string][]).map(([m, l]) => (
              <button key={m} onClick={() => setMetrica(m)}
                className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  metrica === m ? "bg-white text-brand-dark shadow-sm" : "text-slate-500")}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pico && pico.unidades > 0 && (
        <p className="mb-3 text-sm text-slate-500">
          Pico {tienda === TODAS ? "(todas las tiendas)" : `en ${tienda}`}:{" "}
          <span className="font-semibold text-brand-dark">
            {labelDia(pico.dow)} a las {String(pico.hora).padStart(2, "0")}:00
          </span>{" "}
          · {fmt(valorDe(pico))}
        </p>
      )}

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex">
            <div className="w-10 shrink-0" />
            {horas.map((h) => (
              <div key={h} className="flex-1 px-0.5 text-center text-[10px] text-slate-400" style={{ minWidth: 26 }}>{h}</div>
            ))}
          </div>
          {DIAS.map((d) => (
            <div key={d.dow} className="flex items-center">
              <div className="w-10 shrink-0 pr-2 text-right text-xs font-medium text-slate-500">{d.label}</div>
              {horas.map((h) => {
                const c = mapa.get(`${d.dow}-${h}`);
                const v = c ? valorDe(c) : 0;
                const t = v / max;
                const esPico = pico && c && c.dow === pico.dow && c.hora === pico.hora && v > 0;
                return (
                  <div key={h} className="flex-1 p-0.5" style={{ minWidth: 26 }}>
                    <button
                      type="button"
                      onClick={() => c && abrirCelda(d.dow, h)}
                      disabled={!c}
                      title={`${d.label} ${String(h).padStart(2, "0")}:00 — ${fmt(v)}${c ? ` · ${fmtNum(c.unidades)} ops · clic para ver detalle` : ""}`}
                      className={cn(
                        "block aspect-square w-full rounded-[3px] transition",
                        esPico && "ring-2 ring-brand-gold ring-offset-1",
                        c && "cursor-pointer hover:ring-2 hover:ring-brand-blue"
                      )}
                      style={{ background: v > 0 ? color(0.12 + t * 0.88) : "#f4f7fa" }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-400">
        <span>Toca una celda para ver qué operaciones la explican</span>
        <div className="flex items-center gap-2">
          <span>Menos</span>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((t) => (
            <span key={t} className="h-3 w-5 rounded-[3px]" style={{ background: color(t) }} />
          ))}
          <span>Más</span>
        </div>
      </div>

      {/* Detalle de la celda */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSel(null)} />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="font-display text-lg text-slate-800">
                  {labelDia(sel.dow)} · {String(sel.hora).padStart(2, "0")}:00
                </h3>
                <p className="text-xs text-slate-400">
                  Operaciones que más pesan en este hueco · últimos 12 meses
                  {tienda !== TODAS ? ` · ${tienda}` : tiendaPagina ? ` · ${tiendaPagina}` : ""}
                </p>
              </div>
              <button onClick={() => setSel(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-auto p-5">
              {cargando ? (
                <div className="flex h-40 items-center justify-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : detalle.length ? (
                <>
                  <div className="mb-4 flex flex-wrap gap-6 text-sm">
                    <div><span className="text-slate-400">Importe (top 50): </span><span className="font-semibold text-brand-dark">{fmtEur(detalle.reduce((s, m) => s + Number(m.importe ?? 0), 0))}</span></div>
                    <div><span className="text-slate-400">Operaciones mostradas: </span><span className="font-semibold text-slate-700">{detalle.length}</span></div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="px-3 py-2 font-medium">Fecha</th>
                        <th className="px-3 py-2 font-medium">Código</th>
                        <th className="px-3 py-2 font-medium">Descripción</th>
                        <th className="px-3 py-2 font-medium">Empleado</th>
                        <th className="px-3 py-2 font-medium">Tienda</th>
                        <th className="px-3 py-2 text-right font-medium">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.map((m, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="whitespace-nowrap px-3 py-2 text-slate-500">{m.fecha ? new Date(m.fecha).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">{m.codigo}</td>
                          <td className="max-w-[200px] truncate px-3 py-2 text-slate-600">{m.descripcion || m.familia}</td>
                          <td className="px-3 py-2 text-slate-500">{m.empleado}</td>
                          <td className="px-3 py-2 text-slate-500">{m.tienda}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-slate-800">{fmtEur2(m.importe)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">Sin operaciones en este hueco.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
