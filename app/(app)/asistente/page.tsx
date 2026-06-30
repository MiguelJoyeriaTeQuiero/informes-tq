"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string }

const SUGERENCIAS = [
  "¿Cuánto hemos facturado este mes y cómo va vs el año pasado?",
  "Margen bruto del trimestre por familia",
  "¿Qué tienda vende más oro este año?",
  "¿Cuánto stock tenemos a coste ahora mismo?",
];

export default function AsistentePage() {
  const [mensajes, setMensajes] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes, cargando]);

  async function enviar(texto: string) {
    const q = texto.trim();
    if (!q || cargando) return;
    setError(null);
    const nuevos: Msg[] = [...mensajes, { role: "user", content: q }];
    setMensajes(nuevos);
    setInput("");
    setCargando(true);
    try {
      const r = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nuevos }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error");
      setMensajes((m) => [...m, { role: "assistant", content: j.answer }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      {mensajes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-dark text-white">
            <Sparkles className="h-8 w-8" />
          </span>
          <div>
            <h2 className="font-display text-2xl text-slate-900">Pregúntame sobre tu negocio</h2>
            <p className="mt-1 text-sm text-slate-500">Consulto tus datos reales (ventas, compras, márgenes, stock…) y te respondo al momento.</p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-2">
            {SUGERENCIAS.map((s) => (
              <button key={s} onClick={() => enviar(s)} className="rounded-xl border border-slate-200 bg-white p-3 text-left text-sm text-slate-600 transition hover:border-brand-blue hover:shadow-card">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          {mensajes.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", m.role === "user" ? "bg-brand-blue text-white" : "bg-brand-dark text-white")}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </span>
              <div className={cn("max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm", m.role === "user" ? "bg-brand-blue text-white" : "bg-white text-slate-700 shadow-card")}>
                {m.content}
              </div>
            </div>
          ))}
          {cargando && (
            <div className="flex gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-dark text-white"><Sparkles className="h-4 w-4" /></span>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-card"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
            </div>
          )}
          <div ref={finRef} />
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={(e) => { e.preventDefault(); enviar(input); }} className="mt-2 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta…"
          className="input flex-1"
          disabled={cargando}
        />
        <button type="submit" disabled={cargando || !input.trim()} className="btn-primary aspect-square !px-0 w-11">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
