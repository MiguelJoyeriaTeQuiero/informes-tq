"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Store } from "lucide-react";

export function TiendaSelector({ tiendas, actual }: { tiendas: string[]; actual: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set("tienda", value);
    else p.delete("tienda");
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-slate-400" />
      <select
        value={actual}
        onChange={(e) => set(e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-brand-blue"
      >
        <option value="">Todas las tiendas</option>
        {tiendas.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
