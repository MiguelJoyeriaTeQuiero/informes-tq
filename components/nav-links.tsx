"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, CalendarClock, RefreshCcw,
  Wrench, Boxes, Presentation, Settings, Truck, LineChart, Target, Users,
  Wallet, Award, Bell, Sparkles,
} from "lucide-react";

type NavItem =
  | { tipo: "sep"; label: string }
  | { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; permiso?: string };

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/asistente", label: "Asistente IA", icon: Sparkles },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/finanzas", label: "Finanzas y rentabilidad", icon: LineChart },
  { href: "/tesoreria", label: "Tesorería", icon: Wallet },
  { href: "/objetivos", label: "Objetivos", icon: Target },
  { href: "/bono", label: "Bono variable", icon: Award },
  { href: "/clientes", label: "Clientes", icon: Users },
  { tipo: "sep", label: "Operaciones" },
  { href: "/ventas", label: "Ventas", icon: ShoppingBag },
  { href: "/compras", label: "Compras", icon: ShoppingCart },
  { href: "/reservas", label: "Reservas", icon: CalendarClock },
  { href: "/recuperables", label: "Ventas Recuperables", icon: RefreshCcw },
  { href: "/trabajos", label: "Trabajos", icon: Wrench },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { tipo: "sep", label: "Aprovisionamiento" },
  { href: "/aprovisionamiento", label: "Dpto. de Compras", icon: Truck },
  { tipo: "sep", label: "Herramientas" },
  { href: "/presentaciones", label: "Presentaciones", icon: Presentation },
  { href: "/configuracion", label: "Configuración", icon: Settings, permiso: "config" },
];

export function NavLinks({
  permisos,
  onNavigate,
  alertCount = 0,
}: {
  permisos: { config: boolean };
  onNavigate?: () => void;
  alertCount?: number;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
      {NAV.map((item, i) => {
        if ("tipo" in item) {
          return (
            <p key={i} className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-white/35">
              {item.label}
            </p>
          );
        }
        if (item.permiso === "config" && !permisos.config) return null;
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active ? "bg-brand-blue text-white shadow-glow" : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{item.label}</span>
            {item.href === "/alertas" && alertCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {alertCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
