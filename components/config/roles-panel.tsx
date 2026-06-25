"use client";

import { useState, useTransition } from "react";
import { ShieldPlus, Loader2 } from "lucide-react";
import { crearRol } from "@/app/(app)/configuracion/actions";

export function RolesPanel({ roles }: { roles: { name: string; label: string }[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="panel p-6">
      <h2 className="font-display text-lg text-slate-800">Roles</h2>
      <p className="text-sm text-slate-500">Define los roles disponibles para los usuarios.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {roles.map((r) => (
          <span
            key={r.name}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-sand px-3 py-1 text-sm text-brand-dark"
          >
            {r.label}
            <code className="text-[10px] text-slate-400">{r.name}</code>
          </span>
        ))}
      </div>

      <form
        action={(fd) =>
          start(async () => {
            const r = await crearRol(null, fd);
            setMsg(r.ok ? "Rol creado" : r.error || "Error");
          })
        }
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Etiqueta</label>
          <input name="label" placeholder="p. ej. Auditor" className="input w-48" required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Identificador</label>
          <input name="name" placeholder="auditor" className="input w-40" required />
        </div>
        <button className="btn-primary" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldPlus className="h-4 w-4" />}
          Añadir rol
        </button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </form>
    </div>
  );
}
