"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

export function MobileNav({ permisos }: { permisos: { config: boolean } }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);
  // Cierra el drawer al cambiar de ruta
  useEffect(() => setOpen(false), [pathname]);
  // Bloquea el scroll del fondo cuando está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="-ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && open &&
        createPortal(
          <div className="fixed inset-0 z-[100] lg:hidden">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-brand-dark text-white shadow-2xl">
              <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
                <Logo className="h-7 text-white" />
                <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/70 hover:bg-white/10" aria-label="Cerrar menú">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavLinks permisos={permisos} onNavigate={() => setOpen(false)} />
              <div className="border-t border-white/10 p-4 text-[11px] text-white/40">Joyerías Te Quiero · v1.0</div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
