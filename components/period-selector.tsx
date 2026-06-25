"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MESES } from "@/lib/format";

export function PeriodSelector({
  anio,
  mes,
  anios,
}: {
  anio: number;
  mes: number; // 0-11
  anios: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    p.set(key, value);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={mes}
        onChange={(e) => set("mes", e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-brand-blue"
      >
        {MESES.map((m, i) => (
          <option key={i} value={i}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={anio}
        onChange={(e) => set("anio", e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-brand-blue"
      >
        {anios.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </div>
  );
}
