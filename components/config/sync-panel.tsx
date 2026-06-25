"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, CheckCircle2, AlertCircle, Boxes } from "lucide-react";

export function SyncPanel({ ultima }: { ultima: any | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [res, setRes] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sincronizar() {
    setLoading(true);
    setError(null);
    setRes(null);
    try {
      const r = await fetch("/api/sync", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error en la sincronización");
      setRes(j);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function sincronizarStock() {
    setLoadingStock(true);
    setError(null);
    setRes(null);
    try {
      const r = await fetch("/api/sync/stock", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Error sincronizando inventario");
      setRes({ total: j.piezas, porTabla: { inventario: { escritas: j.piezas } } });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingStock(false);
    }
  }

  return (
    <div className="panel p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg text-slate-800">Sincronización con Metabase</h2>
          <p className="mt-1 text-sm text-slate-500">
            Trae los datos más recientes de los 5 informes. El cron lo ejecuta cada día
            laborable a las 08:00; aquí puedes lanzarlo manualmente.
          </p>
          {ultima && (
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
          <button onClick={sincronizar} disabled={loading || loadingStock} className="btn-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar operaciones
          </button>
          <button onClick={sincronizarStock} disabled={loading || loadingStock} className="btn-ghost border border-slate-200">
            {loadingStock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Boxes className="h-4 w-4" />}
            Sincronizar inventario
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
      {res && (
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
