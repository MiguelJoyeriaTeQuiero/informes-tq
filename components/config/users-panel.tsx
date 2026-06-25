"use client";

import { useState, useTransition } from "react";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { crearUsuario, actualizarRol, eliminarUsuario } from "@/app/(app)/configuracion/actions";
import type { Profile } from "@/lib/types";

export function UsersPanel({
  usuarios,
  roles,
}: {
  usuarios: Profile[];
  roles: { name: string; label: string }[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [creando, setCreando] = useState(false);

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg text-slate-800">Usuarios</h2>
          <p className="text-sm text-slate-500">
            Crea usuarios y asigna roles. (También puedes crearlos desde el panel de Supabase.)
          </p>
        </div>
        <button className="btn-ghost" onClick={() => setCreando((c) => !c)}>
          <UserPlus className="h-4 w-4" /> Nuevo usuario
        </button>
      </div>

      {creando && (
        <form
          action={(fd) =>
            start(async () => {
              const r = await crearUsuario(null, fd);
              setMsg({ ok: !!r.ok, text: r.ok ? "Usuario creado" : r.error || "Error" });
              if (r.ok) setCreando(false);
            })
          }
          className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"
        >
          <input name="full_name" placeholder="Nombre completo" className="input" />
          <input name="email" type="email" placeholder="Email" className="input" required />
          <input name="password" type="text" placeholder="Contraseña (6+)" className="input" required />
          <select name="role" className="input" defaultValue="lectura">
            {roles.map((r) => (
              <option key={r.name} value={r.name}>{r.label}</option>
            ))}
          </select>
          <button className="btn-primary sm:col-span-2" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Crear usuario
          </button>
        </form>
      )}

      {msg && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
          {msg.text}
        </p>
      )}

      <div className="mt-5 divide-y divide-slate-100">
        {usuarios.map((u) => (
          <div key={u.id} className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-sand text-xs font-semibold text-brand-dark">
              {(u.full_name || u.email || "?").slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{u.full_name || "—"}</p>
              <p className="truncate text-xs text-slate-400">{u.email}</p>
            </div>
            <select
              defaultValue={u.role}
              onChange={(e) =>
                start(async () => {
                  const r = await actualizarRol(u.id, e.target.value);
                  setMsg({ ok: !!r.ok, text: r.ok ? "Rol actualizado" : r.error || "Error" });
                })
              }
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              {roles.map((r) => (
                <option key={r.name} value={r.name}>{r.label}</option>
              ))}
            </select>
            <button
              onClick={() =>
                start(async () => {
                  if (!confirm(`¿Eliminar a ${u.email}?`)) return;
                  const r = await eliminarUsuario(u.id);
                  setMsg({ ok: !!r.ok, text: r.ok ? "Usuario eliminado" : r.error || "Error" });
                })
              }
              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {!usuarios.length && (
          <p className="py-6 text-center text-sm text-slate-400">No hay usuarios todavía.</p>
        )}
      </div>
    </div>
  );
}
