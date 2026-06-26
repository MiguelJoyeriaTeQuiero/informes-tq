"use client";

import { usePathname } from "next/navigation";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";
import type { Profile } from "@/lib/types";

const TITULOS: Record<string, string> = {
  "/": "Dashboard general",
  "/finanzas": "Finanzas y rentabilidad",
  "/objetivos": "Objetivos",
  "/clientes": "Analítica de clientes",
  "/ventas": "Ventas",
  "/compras": "Compras",
  "/reservas": "Reservas",
  "/recuperables": "Ventas Recuperables",
  "/trabajos": "Trabajos",
  "/inventario": "Inventario y existencias",
  "/aprovisionamiento": "Departamento de Compras",
  "/presentaciones": "Generador de presentaciones",
  "/configuracion": "Configuración",
};

export function Topbar({
  metals,
  profile,
  email,
  permisos,
}: {
  metals: React.ReactNode;
  profile: Profile | null;
  email?: string;
  permisos: { config: boolean };
}) {
  const pathname = usePathname();
  const titulo =
    TITULOS[pathname] ??
    Object.entries(TITULOS).find(([k]) => k !== "/" && pathname.startsWith(k))?.[1] ??
    "Panel";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav permisos={permisos} />
        <h1 className="truncate font-display text-lg text-slate-900 sm:text-xl">{titulo}</h1>
      </div>
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="hidden sm:block">{metals}</div>
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
        <UserMenu profile={profile} email={email} />
      </div>
    </header>
  );
}
