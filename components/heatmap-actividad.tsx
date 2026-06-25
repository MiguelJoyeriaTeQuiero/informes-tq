"use client";

import { useMemo, useState } from "react";
import { fmtEur, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Celda {
  dow: number;
  hora: number;
  euros: number;
  unidades: number;
}

// Lunes primero
const DIAS = [
  { dow: 1, label: "Lun" },
  { dow: 2, label: "Mar" },
  { dow: 3, label: "Mié" },
  { dow: 4, label: "Jue" },
  { dow: 5, label: "Vie" },
  { dow: 6, label: "Sáb" },
  { dow: 0, label: "Dom" },
];

// interpola de claro (#eef6fb) a azul marca (#00557F)
function color(t: number) {
  const a = [238, 246, 251];
  const b = [0, 85, 127];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function HeatmapActividad({ data }: { data: Celda[] }) {
  const [metrica, setMetrica] = useState<"unidades" | "euros">("unidades");

  const { mapa, horas, max, pico } = useMemo(() => {
    const mapa = new Map<string, Celda>();
    let hMin = 23, hMax = 0, max = 0;
    let pico: Celda | null = null;
    for (const c of data) {
      mapa.set(`${c.dow}-${c.hora}`, c);
      if (c.unidades > 0) {
        hMin = Math.min(hMin, c.hora);
        hMax = Math.max(hMax, c.hora);
      }
      const v = metrica === "euros" ? Math.abs(c.euros) : c.unidades;
      if (v > max) { max = v; }
      if (!pico || (metrica === "euros" ? Math.abs(c.euros) : c.unidades) > (metrica === "euros" ? Math.abs(pico.euros) : pico.unidades)) pico = c;
    }
    if (hMin > hMax) { hMin = 9; hMax = 21; }
    const horas = Array.from({ length: hMax - hMin + 1 }, (_, i) => hMin + i);
    return { mapa, horas, max: max || 1, pico };
  }, [data, metrica]);

  const fmt = metrica === "euros" ? fmtEur : fmtNum;
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
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button onClick={() => setMetrica("unidades")}
            className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition",
              metrica === "unidades" ? "bg-white text-brand-dark shadow-sm" : "text-slate-500")}>
            Operaciones
          </button>
          <button onClick={() => setMetrica("euros")}
            className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition",
              metrica === "euros" ? "bg-white text-brand-dark shadow-sm" : "text-slate-500")}>
            Importe €
          </button>
        </div>
      </div>

      {pico && (pico.unidades > 0) && (
        <p className="mb-3 text-sm text-slate-500">
          Pico de actividad:{" "}
          <span className="font-semibold text-brand-dark">
            {labelDia(pico.dow)} a las {String(pico.hora).padStart(2, "0")}:00
          </span>{" "}
          · {fmt(metrica === "euros" ? Math.abs(pico.euros) : pico.unidades)}
        </p>
      )}

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* cabecera de horas */}
          <div className="flex">
            <div className="w-10 shrink-0" />
            {horas.map((h) => (
              <div key={h} className="flex-1 px-0.5 text-center text-[10px] text-slate-400" style={{ minWidth: 26 }}>
                {h}
              </div>
            ))}
          </div>
          {/* filas por día */}
          {DIAS.map((d) => (
            <div key={d.dow} className="flex items-center">
              <div className="w-10 shrink-0 pr-2 text-right text-xs font-medium text-slate-500">{d.label}</div>
              {horas.map((h) => {
                const c = mapa.get(`${d.dow}-${h}`);
                const v = c ? (metrica === "euros" ? Math.abs(c.euros) : c.unidades) : 0;
                const t = v / max;
                const esPico = pico && c && c.dow === pico.dow && c.hora === pico.hora && v > 0;
                return (
                  <div key={h} className="flex-1 p-0.5" style={{ minWidth: 26 }}>
                    <div
                      title={`${d.label} ${String(h).padStart(2, "0")}:00 — ${fmt(v)}${c ? ` · ${fmtNum(c.unidades)} ops` : ""}`}
                      className={cn("aspect-square rounded-[3px] transition", esPico && "ring-2 ring-brand-gold ring-offset-1")}
                      style={{ background: v > 0 ? color(0.12 + t * 0.88) : "#f4f7fa" }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* leyenda */}
      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-400">
        <span>Menos</span>
        {[0.1, 0.3, 0.5, 0.7, 0.9].map((t) => (
          <span key={t} className="h-3 w-5 rounded-[3px]" style={{ background: color(t) }} />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}
