import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function KpiCard({
  label,
  valor,
  sub,
  variacion,
  icon,
  acento = false,
}: {
  label: string;
  valor: string;
  sub?: string;
  variacion?: { texto: string; positivo: boolean };
  icon?: React.ReactNode;
  acento?: boolean;
}) {
  return (
    <div className={cn("kpi-card", acento && "bg-brand-dark text-white border-transparent")}>
      <div className="flex items-start justify-between">
        <p className={cn("text-sm", acento ? "text-white/70" : "text-slate-500")}>
          {label}
        </p>
        {icon && (
          <span className={cn(acento ? "text-brand-blue" : "text-slate-300")}>{icon}</span>
        )}
      </div>
      <p className={cn("mt-2 font-display text-2xl", acento ? "text-white" : "text-slate-900")}>
        {valor}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {sub && (
          <span className={cn("text-xs", acento ? "text-white/50" : "text-slate-400")}>
            {sub}
          </span>
        )}
        {variacion && variacion.texto !== "—" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
              variacion.positivo
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600",
              acento && "bg-white/10 text-white"
            )}
          >
            {variacion.positivo ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {variacion.texto}
          </span>
        )}
      </div>
    </div>
  );
}
