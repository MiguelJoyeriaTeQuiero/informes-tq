"use client";

import { useState } from "react";
import { AreaTendencia } from "./charts";
import { cn } from "@/lib/utils";

type Punto = { label: string; euros: number; gramos: number; unidades: number };

export function TrendToggle({
  mensual,
  diario,
}: {
  mensual: Punto[];
  diario: Punto[];
}) {
  const [vista, setVista] = useState<"mensual" | "diario">("mensual");
  const [metrica, setMetrica] = useState<"euros" | "unidades">("euros");

  const data = vista === "mensual" ? mensual : diario;

  const Btn = ({
    activo,
    onClick,
    children,
  }: {
    activo: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium transition",
        activo ? "bg-white text-brand-dark shadow-sm" : "text-slate-500 hover:text-slate-700"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="panel p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg text-slate-800">Evolución</h2>
        <div className="flex gap-3">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <Btn activo={vista === "mensual"} onClick={() => setVista("mensual")}>
              Mensual (12m)
            </Btn>
            <Btn activo={vista === "diario"} onClick={() => setVista("diario")}>
              Diario (mes)
            </Btn>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <Btn activo={metrica === "euros"} onClick={() => setMetrica("euros")}>
              Importe €
            </Btn>
            <Btn activo={metrica === "unidades"} onClick={() => setMetrica("unidades")}>
              Operaciones
            </Btn>
          </div>
        </div>
      </div>
      <AreaTendencia
        data={data}
        dataKey={metrica}
        formato={metrica === "euros" ? "euro" : "num"}
      />
    </div>
  );
}
