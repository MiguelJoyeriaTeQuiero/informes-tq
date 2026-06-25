import { getPreciosMetales } from "@/lib/metals";
import { fmtEur2 } from "@/lib/format";

export async function MetalsWidget() {
  let precios;
  try {
    precios = await getPreciosMetales();
  } catch {
    return null;
  }

  const items = [
    { label: "Oro", color: "#C8A164", precio: precios.oro },
    { label: "Plata", color: "#9aa6b2", precio: precios.plata },
  ];

  return (
    <div className="flex items-center gap-4">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: it.color }}
            aria-hidden
          />
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              {it.label}
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {fmtEur2(it.precio.eurGramo)}
              <span className="text-[10px] font-normal text-slate-400">/g</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
