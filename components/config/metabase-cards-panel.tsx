import { OPERACION_LIST, STOCK_CARD } from "@/lib/types";
import { ExternalLink, FileText, Boxes } from "lucide-react";

export function MetabaseCardsPanel({ metabaseUrl }: { metabaseUrl: string }) {
  const base = metabaseUrl.replace(/\/$/, "");
  const items = [
    ...OPERACION_LIST.map((o) => ({
      grupo: "Operaciones",
      label: o.label,
      nombre: o.metabaseNombre,
      cardId: o.cardId,
      icon: <FileText className="h-4 w-4" />,
    })),
    {
      grupo: "Inventario",
      label: STOCK_CARD.label,
      nombre: STOCK_CARD.metabaseNombre,
      cardId: STOCK_CARD.cardId,
      icon: <Boxes className="h-4 w-4" />,
    },
  ];

  return (
    <div className="panel p-6">
      <h2 className="font-display text-lg text-slate-800">Informes de Metabase sincronizados</h2>
      <p className="mt-1 text-sm text-slate-500">
        Fuentes de datos que alimentan la aplicación. Haz clic para abrir el informe en Metabase.
      </p>

      <div className="mt-4 divide-y divide-slate-100">
        {items.map((it) => (
          <div key={it.cardId} className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-sand text-brand-dark">
              {it.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">
                {it.label}
                <span className="ml-2 text-xs font-normal text-slate-400">{it.grupo}</span>
              </p>
              <p className="truncate text-xs text-slate-500">{it.nombre}</p>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
              #{it.cardId}
            </span>
            <a
              href={`${base}/question/${it.cardId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-brand-blue"
              title="Abrir en Metabase"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
