import { fetchCardData } from "./metabase";
import { buildRow } from "./transform";
import { createAdminClient } from "./supabase/admin";
import { OPERACION_LIST, type OperacionKey } from "./types";

const BATCH = 1000;

export interface SyncResult {
  ok: boolean;
  porTabla: Record<string, { origen: number; escritas: number; error?: string }>;
  total: number;
}

/** Sincroniza los 5 cards de Metabase → Supabase (upsert idempotente por row_hash). */
export async function sincronizarTodo(triggeredBy: string): Promise<SyncResult> {
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

  for (const op of OPERACION_LIST) {
    try {
      const filas = await fetchCardData(op.cardId);
      const canon = filas.map((f) => buildRow(op.key as OperacionKey, f, "metabase"));
      let escritas = 0;
      for (let i = 0; i < canon.length; i += BATCH) {
        const chunk = canon.slice(i, i + BATCH);
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
