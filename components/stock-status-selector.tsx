"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

const NOMBRES: Record<string, string> = {
  DIS: "Disponible", RES: "Reservado", ENV: "En tránsito", BLO: "Bloqueado",
  DEF: "Defectuoso", DES: "Descatalogado", DEV: "Devuelto", PRE: "Presupuesto",
  ARR: "Arreglo", IPO: "IPO", ROB: "Robado",
};

export function StockStatusSelector({
  estados,
  seleccion,
}: {
  estados: { status: string; piezas: number }[];
  seleccion: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function toggle(status: string) {
    const set = new Set(seleccion);
    if (set.has(status)) set.delete(status);
    else set.add(status);
    const p = new URLSearchParams(params.toString());
    if (set.size) p.set("estados", [...set].join(","));
    else p.delete("estados");
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-slate-400">Estados:</span>
      {estados.map((e) => {
        const activo = seleccion.includes(e.status);
        return (
          <button
            key={e.status}
            onClick={() => toggle(e.status)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition",
              activo
                ? "border-transparent bg-brand-dark text-white"
                : "border-slate-200 text-slate-500 hover:bg-slate-50"
            )}
          >
            {NOMBRES[e.status] || e.status}
            <span className={cn("text-xs", activo ? "text-white/60" : "text-slate-400")}>
              {fmtNum(e.piezas)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
