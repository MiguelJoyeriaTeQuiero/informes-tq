import { fetchCardData } from "./metabase";
import { buildRow } from "./transform";
import { createAdminClient } from "./supabase/admin";
import { getFuentes } from "./sources";
import { OPERACIONES, type OperacionKey } from "./types";

const BATCH = 1000;

export interface SyncResult {
  ok: boolean;
  porTabla: Record<string, { origen: number; escritas: number; error?: string }>;
  total: number;
}

export interface SyncProgress {
  fase: string;
  actual: number;
  total: number;
  etiqueta: string;
}

/** Sincroniza los 5 cards de Metabase → Supabase (upsert idempotente por row_hash). */
export async function sincronizarTodo(
  triggeredBy: string,
  onProgress?: (p: SyncProgress) => void
): Promise<SyncResult> {
  const admin = createAdminClient();
  const { data: logRow } = await admin
    .from("sync_log")
    .insert({ triggered_by: triggeredBy, status: "running" })
    .select("id")
    .single();
  const logId = logRow?.id;

  const porTabla: SyncResult["porTabla"] = {};
  let total = 0;
  let huboError = false;

  // Fuentes activas de tipo operación, leídas desde BD (editables en Configuración)
  const fuentes = (await getFuentes()).filter(
    (f) => f.tipo === "operacion" && f.activo && f.key in OPERACIONES
  );
  const totalOps = fuentes.length;

  for (let i = 0; i < totalOps; i++) {
    const op = fuentes[i];
    onProgress?.({
      fase: "operaciones",
      actual: i,
      total: totalOps,
      etiqueta: `Sincronizando ${op.label}…`,
    });
    try {
      const filas = await fetchCardData(op.card_id);
      // Dedup por row_hash: dos líneas idénticas darían el mismo hash y Postgres
      // no permite actualizar la misma fila dos veces en un solo upsert.
      const vistos = new Set<string>();
      const canon = filas
        .map((f) => buildRow(op.key as OperacionKey, f, "metabase"))
        .filter((r) => {
          const h = r.row_hash as string;
          if (vistos.has(h)) return false;
          vistos.add(h);
          return true;
        });
      let escritas = 0;
      for (let j = 0; j < canon.length; j += BATCH) {
        const chunk = canon.slice(j, j + BATCH);
        const { error } = await admin
          .from(op.key)
          .upsert(chunk, { onConflict: "row_hash", ignoreDuplicates: false });
        if (error) throw new Error(error.message);
        escritas += chunk.length;
      }
      porTabla[op.key] = { origen: filas.length, escritas };
      total += escritas;
    } catch (e) {
      huboError = true;
      porTabla[op.key] = { origen: 0, escritas: 0, error: (e as Error).message };
    }
  }

  onProgress?.({ fase: "operaciones", actual: totalOps, total: totalOps, etiqueta: "Completado" });

  if (logId) {
    await admin
      .from("sync_log")
      .update({
        finished_at: new Date().toISOString(),
        status: huboError ? "error" : "ok",
        detail: porTabla,
        rows_total: total,
      })
      .eq("id", logId);
  }

  return { ok: !huboError, porTabla, total };
}
