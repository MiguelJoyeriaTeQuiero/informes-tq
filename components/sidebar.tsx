"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  CalendarClock,
  RefreshCcw,
  Wrench,
  Presentation,
  Settings,
  Boxes,
} from "lucide-react";

type NavItem =
  | { tipo: "sep"; label: string }
  | {
      href: string;
      label: string;
      icon: typeof LayoutDashboard;
      exact?: boolean;
      permiso?: string;
    };

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { tipo: "sep", label: "Operaciones" },
  { href: "/ventas", label: "Ventas", icon: ShoppingBag },
  { href: "/compras", label: "Compras", icon: ShoppingCart },
  { href: "/reservas", label: "Reservas", icon: CalendarClock },
  { href: "/recuperables", label: "Ventas Recuperables", icon: RefreshCcw },
  { href: "/trabajos", label: "Trabajos", icon: Wrench },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { tipo: "sep", label: "Herramientas" },
  { href: "/presentaciones", label: "Presentaciones", icon: Presentation },
  { href: "/configuracion", label: "Configuración", icon: Settings, permiso: "config" },
];

export function Sidebar({ permisos }: { permisos: { config: boolean } }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-brand-dark text-white lg:flex">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Logo className="h-7 text-white" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {NAV.map((item, i) => {
          if ("tipo" in item) {
            return (
              <p
                key={i}
                className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-white/35"
              >
                {item.label}
              </p>
            );
          }
          const it = item;
          if (it.permiso === "config" && !permisos.config) return null;
          const active = it.exact
            ? pathname === it.href
            : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-brand-blue text-white shadow-glow"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4 text-[11px] text-white/40">
        Joyerías Te Quiero · v1.0
      </div>
    </aside>
  );
}
