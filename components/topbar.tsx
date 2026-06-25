"use client";

import { usePathname } from "next/navigation";
import { UserMenu } from "./user-menu";
import type { Profile } from "@/lib/types";

const TITULOS: Record<string, string> = {
  "/": "Dashboard general",
  "/ventas": "Ventas",
  "/compras": "Compras",
  "/reservas": "Reservas",
  "/recuperables": "Ventas Recuperables",
  "/trabajos": "Trabajos",
  "/inventario": "Inventario y existencias",
  "/presentaciones": "Generador de presentaciones",
  "/configuracion": "Configuración",
};

export function Topbar({
  metals,
  profile,
  email,
}: {
  metals: React.ReactNode;
  profile: Profile | null;
  email?: string;
}) {
  const pathname = usePathname();
  const titulo =
    TITULOS[pathname] ??
    Object.entries(TITULOS).find(([k]) => k !== "/" && pathname.startsWith(k))?.[1] ??
    "Panel";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <h1 className="font-display text-xl text-slate-900">{titulo}</h1>
      <div className="flex items-center gap-6">
        <div className="hidden sm:block">{metals}</div>
        <div className="h-8 w-px bg-slate-200" />
        <UserMenu profile={profile} email={email} />
      </div>
    </header>
  );
}
