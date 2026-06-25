import { createAdminClient } from "./supabase/admin";

const CARD_STOCK = 353;
const DB_ID = 3;
const PAGE = 2000;

// Campos que pedimos a Metabase (nombres reales de columna, minúscula)
const CAMPOS = [
  "id", "code", "description", "family", "gem_type", "karat", "status",
  "total_product_weight", "gem_weight", "base_price", "final_price",
  "cost_price", "discount_amount", "taxes_amount", "metal_source",
  "store_name", "location", "created_at", "updated_at", "deleted_at",
];

function metalDeKarat(karat: string | null): "oro" | "plata" | "otro" {
  const k = (karat || "").toUpperCase();
  if (k.startsWith("AU")) return "oro";
  if (k.startsWith("AG")) return "plata";
  return "otro";
}
function fuenteMetal(src: string | null): string {
  const s = (src || "").toUpperCase();
  if (s === "NEW") return "nuevo";
  if (s === "USED") return "ocasion";
  return "desconocido";
}
const eur = (v: any) => (v == null ? null : Number(v) / 100);
const gr = (v: any) => (v == null ? null : Number(v) / 1000);

async function fetchPagina(cursor: string | null) {
  const base = process.env.METABASE_URL!;
  const key = process.env.METABASE_API_KEY!;
  const field = (n: string, t = "type/Text") => ["field", n, { "base-type": t }];
  const noVen = ["!=", field("status"), "VEN"];
  const filtro = cursor
    ? ["and", noVen, [">", field("id", "type/UUID"), cursor]]
    : noVen;

  const query = {
    database: DB_ID,
    type: "query",
    query: {
      "source-table": `card__${CARD_STOCK}`,
      fields: CAMPOS.map((c) =>
        c === "id" ? field("id", "type/UUID") : field(c)
      ),
      filter: filtro,
      "order-by": [["asc", field("id", "type/UUID")]],
      limit: PAGE,
    },
  };

  const res = await fetch(`${base}/api/dataset`, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(query),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Metabase dataset ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(String(j.error).slice(0, 300));
  const cols: string[] = j.data.cols.map((c: any) => c.name);
  const idx = Object.fromEntries(cols.map((c, i) => [c, i]));
  return { rows: j.data.rows as any[][], idx };
}

export interface StockSyncResult {
  ok: boolean;
  piezas: number;
  paginas: number;
  snapshot: number;
  error?: string;
}

/**
 * Sincroniza el inventario (todos los estados excepto VEN) desde Metabase a Supabase,
 * paginando por cursor de id, y crea el snapshot mensual de valoración.
 */
export async function sincronizarStock(triggeredBy: string): Promise<StockSyncResult> {
  const admin = createAdminClient();
  const runStart = new Date().toISOString();
  const { data: logRow } = await admin
    .from("sync_log")
    .insert({ triggered_by: `${triggeredBy} (stock)`, status: "running" })
    .select("id")
    .single();
  const logId = logRow?.id;

  let cursor: string | null = null;
  let total = 0;
  let paginas = 0;

  try {
    for (;;) {
      const { rows, idx }: { rows: any[][]; idx: Record<string, number> } =
        await fetchPagina(cursor);
      if (!rows.length) break;
      paginas++;

      const canon = rows.map((r) => ({
        id: r[idx.id],
        code: r[idx.code],
        descripcion: r[idx.description],
        familia: r[idx.family],
        gem_type: r[idx.gem_type],
        karat: r[idx.karat],
        metal: metalDeKarat(r[idx.karat]),
        metal_source: fuenteMetal(r[idx.metal_source]),
        peso_g: gr(r[idx.total_product_weight]),
        gem_weight_g: gr(r[idx.gem_weight]),
        status: r[idx.status],
        base_price_eur: eur(r[idx.base_price]),
        final_price_eur: eur(r[idx.final_price]),
        cost_price_eur: eur(r[idx.cost_price]),
        discount_eur: eur(r[idx.discount_amount]),
        taxes_eur: eur(r[idx.taxes_amount]),
        store_name: r[idx.store_name],
        location: r[idx.location],
        created_at: r[idx.created_at] || null,
        updated_at: r[idx.updated_at] || null,
        deleted_at: r[idx.deleted_at] || null,
        synced_at: runStart,
      }));

      const { error } = await admin.from("stock").upsert(canon, { onConflict: "id" });
      if (error) throw new Error(error.message);

      total += canon.length;
      cursor = rows[rows.length - 1][idx.id];
      if (rows.length < PAGE) break;
    }

    // Elimina piezas que ya no existen / pasaron a VEN
    await admin.from("stock").delete().lt("synced_at", runStart);

    // Snapshot mensual (día 1 del mes actual)
    const hoy = new Date();
    const primeroMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    const { data: snap } = await admin.rpc("crear_snapshot_stock", { p_fecha: primeroMes });

    if (logId)
      await admin.from("sync_log").update({
        finished_at: new Date().toISOString(),
        status: "ok",
        rows_total: total,
        detail: { paginas, snapshot_filas: snap ?? 0 },
      }).eq("id", logId);

    return { ok: true, piezas: total, paginas, snapshot: Number(snap ?? 0) };
  } catch (e) {
    if (logId)
      await admin.from("sync_log").update({
        finished_at: new Date().toISOString(),
        status: "error",
        rows_total: total,
        detail: { error: (e as Error).message, paginas },
      }).eq("id", logId);
    return { ok: false, piezas: total, paginas, snapshot: 0, error: (e as Error).message };
  }
}
