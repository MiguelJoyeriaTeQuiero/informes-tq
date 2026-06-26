"use client";

import { useState, useTransition } from "react";
import { ExternalLink, FileText, Boxes, Pencil, Check, X, Loader2 } from "lucide-react";
import { actualizarFuente } from "@/app/(app)/configuracion/actions";
import { cn } from "@/lib/utils";

export interface Fuente {
  key: string;
  label: string;
  card_id: number;
  metabase_nombre: string | null;
  tipo: string;
  activo: boolean;
}

export function MetabaseCardsPanel({
  fuentes,
  metabaseUrl,
  editable,
}: {
  fuentes: Fuente[];
  metabaseUrl: string;
  editable: boolean;
}) {
  const base = metabaseUrl.replace(/\/$/, "");
  const [pending, start] = useTransition();
  const [editando, setEditando] = useState<string | null>(null);
  const [cardId, setCardId] = useState<number>(0);
  const [nombre, setNombre] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function empezar(f: Fuente) {
    setEditando(f.key);
    setCardId(f.card_id);
    setNombre(f.metabase_nombre ?? "");
    setMsg(null);
  }

  function guardar(key: string) {
    start(async () => {
      const r = await actualizarFuente(key, { card_id: cardId, metabase_nombre: nombre });
      setMsg({ ok: !!r.ok, text: r.ok ? "Fuente actualizada" : r.error || "Error" });
      if (r.ok) setEditando(null);
    });
  }

  function toggle(f: Fuente) {
    start(async () => {
      const r = await actualizarFuente(f.key, { activo: !f.activo });
      setMsg({ ok: !!r.ok, text: r.ok ? "Actualizado" : r.error || "Error" });
    });
  }

  return (
    <div className="panel p-6">
      <h2 className="font-display text-lg text-slate-800">Informes de Metabase sincronizados</h2>
      <p className="mt-1 text-sm text-slate-500">
        Fuentes de datos que alimentan la aplicación. {editable && "Puedes cambiar el ID del informe o desactivarlo."}
      </p>

      {msg && (
        <p className={cn("mt-3 rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
          {msg.text}
        </p>
      )}

      <div className="mt-4 divide-y divide-slate-100">
        {fuentes.map((f) => {
          const enEdicion = editando === f.key;
          return (
            <div key={f.key} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-sand text-brand-dark">
                {f.tipo === "stock" ? <Boxes className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  {f.label}
                  {!f.activo && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">desactivado</span>}
                </p>
                {enEdicion ? (
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Nombre del informe"
                    className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-blue"
                  />
                ) : (
                  <p className="truncate text-xs text-slate-500">{f.metabase_nombre}</p>
                )}
              </div>

              {/* ID del card */}
              {enEdicion ? (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>#</span>
                  <input
                    type="number"
                    value={cardId}
                    onChange={(e) => setCardId(parseInt(e.target.value) || 0)}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 outline-none focus:border-brand-blue"
                  />
                </div>
              ) : (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">#{f.card_id}</span>
              )}

              {/* Acciones */}
              {editable && (
                <div className="flex items-center gap-1">
                  {enEdicion ? (
                    <>
                      <button onClick={() => guardar(f.key)} disabled={pending} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50" title="Guardar">
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button onClick={() => setEditando(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Cancelar">
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => toggle(f)} disabled={pending}
                        className={cn("relative h-5 w-9 rounded-full transition", f.activo ? "bg-brand-blue" : "bg-slate-300")}
                        title={f.activo ? "Desactivar" : "Activar"}>
                        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", f.activo ? "left-[18px]" : "left-0.5")} />
                      </button>
                      <button onClick={() => empezar(f)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-blue" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              )}

              <a href={`${base}/question/${f.card_id}`} target="_blank" rel="noopener noreferrer"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-brand-blue" title="Abrir en Metabase">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          );
        })}
      </div>

      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
        Para añadir un tipo de operación totalmente nuevo (con su propia tabla) hace falta un pequeño ajuste técnico.
        Cambiar el informe de una fuente existente o desactivarla se hace aquí mismo.
      </p>
    </div>
  );
}
