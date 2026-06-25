"use client";

import { useState } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import type { Profile, Rol } from "@/lib/types";

const ROL_LABEL: Record<Rol, string> = {
  admin: "Administrador",
  financiero: "Director financiero",
  direccion: "Dirección",
  lectura: "Solo lectura",
};

export function UserMenu({
  profile,
  email,
}: {
  profile: Profile | null;
  email?: string;
}) {
  const [open, setOpen] = useState(false);
  const nombre = profile?.full_name || email || "Usuario";
  const iniciales = nombre
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-dark text-xs font-semibold text-white">
          {iniciales}
        </span>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium leading-tight text-slate-800">{nombre}</p>
          <p className="text-[11px] leading-tight text-slate-400">
            {profile ? ROL_LABEL[profile.role] : ""}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-100 bg-white p-2 shadow-card">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-slate-800">{nombre}</p>
              <p className="truncate text-xs text-slate-400">{email}</p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
