import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

export function Sidebar({ permisos }: { permisos: { config: boolean } }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-brand-dark text-white lg:flex lg:sticky lg:top-0 lg:h-screen lg:self-start">
      <div className="flex h-16 items-center border-b border-white/10 px-6">
        <Logo className="h-7 text-white" />
      </div>
      <NavLinks permisos={permisos} />
      <div className="border-t border-white/10 p-4 text-[11px] text-white/40">
        Joyerías Te Quiero · v1.0
      </div>
    </aside>
  );
}
