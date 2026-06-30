"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function TrimestreSelector({ anio, trimestre, anios }: { anio: number; trimestre: number; anios: number[] }) {
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
      <select value={trimestre} onChange={(e) => set("t", e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
        {[1, 2, 3, 4].map((t) => <option key={t} value={t}>{t}º trimestre</option>)}
      </select>
      <select value={anio} onChange={(e) => set("anio", e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
        {anios.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
    </div>
  );
}
