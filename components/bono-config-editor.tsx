"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarBonoConfig } from "@/app/(app)/bono/actions";
import { Loader2, Check } from "lucide-react";

export function BonoConfigEditor({
  oro, plata, puedeEditar,
}: { oro: number; plata: number; puedeEditar: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [vOro, setVOro] = useState(oro);
  const [vPlata, setVPlata] = useState(plata);
  const [ok, setOk] = useState(false);

  function guardar() {
    start(async () => {
      await guardarBonoConfig(vOro, vPlata);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
      router.refresh();
    });
  }

  return (
    <div className="panel p-5">
      <h2 className="font-display text-lg text-slate-800">Tarifa del bono (€ por gramo vendido)</h2>
      <p className="mb-3 text-xs text-slate-400">El bono de cada tienda = gramos de oro × tarifa oro + gramos de plata × tarifa plata.</p>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">€/g Oro</span>
          <input type="number" step="0.01" value={vOro} disabled={!puedeEditar}
            onChange={(e) => setVOro(parseFloat(e.target.value) || 0)}
            className="input w-32 disabled:bg-slate-50" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">€/g Plata</span>
          <input type="number" step="0.01" value={vPlata} disabled={!puedeEditar}
            onChange={(e) => setVPlata(parseFloat(e.target.value) || 0)}
            className="input w-32 disabled:bg-slate-50" />
        </label>
        {puedeEditar && (
          <button onClick={guardar} disabled={pending} className="btn-primary">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : ok ? <Check className="h-4 w-4" /> : null}
            Guardar tarifa
          </button>
        )}
      </div>
    </div>
  );
}
