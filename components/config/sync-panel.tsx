"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, CheckCircle2, AlertCircle, Boxes } from "lucide-react";

type Corriendo = "ops" | "stock" | null;

export function SyncPanel({ ultima }: { ultima: any | null }) {
  const router = useRouter();
  const [corriendo, setCorriendo] = useState<Corriendo>(null);
  const [pct, setPct] = useState(0);
  const [etiqueta, setEtiqueta] = useState("");
  const [res, setRes] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(tipo: "ops" | "stock", url: string) {
    setCorriendo(tipo);
    setError(null);
    setRes(null);
    setPct(0);
    setEtiqueta("Iniciando…");
    try {
      const resp = await fetch(url, { method: "POST" });
      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error || `Error ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const linea = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!linea) continue;
          const msg = JSON.parse(linea);
          if (msg.type === "progress") {
            const p = msg.total ? Math.min(100, Math.round((msg.actual / msg.total) * 100)) : 0;
            setPct(p);
            setEtiqueta(msg.etiqueta || "");
          } else if (msg.type === "done") {
            setPct(100);
            setEtiqueta("Completado");
            setRes(tipo === "stock"
              ? { total: msg.result.piezas, porTabla: { inventario: { escritas: msg.result.piezas } } }
              : msg.result);
          } else if (msg.type === "error") {
            throw new Error(msg.error);
          }
        }
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCorriendo(null);
    }
  }

  const ocupado = corriendo !== null;

  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg text-slate-800">Sincronización con Metabase</h2>
          <p className="mt-1 text-sm text-slate-500">
            Trae los datos más recientes. El cron sincroniza las operaciones cada día laborable
            a las 08:00; aquí puedes lanzarlo manualmente.
          </p>
          {ultima && !ocupado && !res && (
            <p className="mt-3 text-xs text-slate-400">
              Última sincronización:{" "}
              <span className="font-medium text-slate-600">
                {new Date(ultima.started_at).toLocaleString("es-ES")}
              </span>{" "}
              · {ultima.triggered_by} ·{" "}
              <span className={ultima.status === "ok" ? "text-emerald-600" : ultima.status === "error" ? "text-red-500" : "text-amber-500"}>
                {ultima.status}
              </span>
              {ultima.rows_total != null && ` · ${ultima.rows_total.toLocaleString("es-ES")} filas`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <button onClick={() => ejecutar("ops", "/api/sync")} disabled={ocupado} className="btn-primary">
            {corriendo === "ops" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar operaciones
          </button>
          <button onClick={() => ejecutar("stock", "/api/sync/stock")} disabled={ocupado} className="btn-ghost border border-slate-200">
            {corriendo === "stock" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Boxes className="h-4 w-4" />}
            Sincronizar inventario
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      {ocupado && (
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate-600">{etiqueta}</span>
            <span className="font-semibold text-brand-dark">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-blue transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
      {res && !ocupado && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" /> Completado · {res.total?.toLocaleString("es-ES")} filas
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
            {Object.entries(res.porTabla || {}).map(([k, v]: any) => (
              <li key={k} className="flex justify-between">
                <span className="capitalize text-slate-600">{k}</span>
                <span className={v.error ? "text-red-500" : "text-emerald-700"}>
                  {v.error ? "error" : `${v.escritas}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
