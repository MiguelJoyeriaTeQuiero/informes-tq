import { fetchCardData } from "./metabase";
import { createAdminClient } from "./supabase/admin";
import { REPORTES_COMPRAS } from "./compras-config";

const BATCH = 1000;

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export interface ComprasSyncResult {
  ok: boolean;
  porReporte: Record<string, { filas: number; error?: string }>;
  total: number;
}

export async function sincronizarCompras(
  triggeredBy: string,
  onProgress?: (p: { fase: string; actual: number; total: number; etiqueta: string }) => void
): Promise<ComprasSyncResult> {
  const admin = createAdminClient();
  const { data: logRow } = await admin
    .from("sync_log")
    .insert({ triggered_by: `${triggeredBy} (compras)`, status: "running" })
    .select("id")
    .single();
  const logId = logRow?.id;

  const porReporte: ComprasSyncResult["porReporte"] = {};
  let total = 0;
  let huboError = false;
  const hoy = new Date();
  const snapDate = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()))
    .toISOString()
    .slice(0, 10);

  for (let i = 0; i < REPORTES_COMPRAS.length; i++) {
    const r = REPORTES_COMPRAS[i];
    onProgress?.({ fase: "compras", actual: i, total: REPORTES_COMPRAS.length, etiqueta: `Compras · ${r.label}…` });
    try {
      const filas = await fetchCardData(r.cardId);

      await admin.from("compras_filas").delete().eq("reporte", r.key);
      for (let j = 0; j < filas.length; j += BATCH) {
        const chunk = filas.slice(j, j + BATCH).map((fila) => ({ reporte: r.key, fila }));
        const { error } = await admin.from("compras_filas").insert(chunk);
        if (error) throw new Error(error.message);
      }

      // Métricas del snapshot
      const kpis: Record<string, number> = {};
      for (const k of r.kpis) kpis[k.col] = filas.reduce((s, f) => s + (num(f[k.col]) ?? 0), 0);
      const estados: Record<string, number> = {};
      if (r.estadoCol)
        for (const f of filas) {
          const e = String(f[r.estadoCol] ?? "(sin dato)") || "(sin dato)";
          estados[e] = (estados[e] || 0) + 1;
        }
      await admin.from("compras_snapshots").upsert({
        reporte: r.key,
        snapshot_date: snapDate,
        metricas: { total: filas.length, kpis, estados },
      });

      porReporte[r.key] = { filas: filas.length };
      total += filas.length;
    } catch (e) {
      huboError = true;
      porReporte[r.key] = { filas: 0, error: (e as Error).message };
    }
  }

  onProgress?.({ fase: "compras", actual: REPORTES_COMPRAS.length, total: REPORTES_COMPRAS.length, etiqueta: "Completado" });

  if (logId)
    await admin.from("sync_log").update({
      finished_at: new Date().toISOString(),
      status: huboError ? "error" : "ok",
      rows_total: total,
      detail: porReporte,
    }).eq("id", logId);

  return { ok: !huboError, porReporte, total };
}
