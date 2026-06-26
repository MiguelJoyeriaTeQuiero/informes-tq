import { createAdminClient } from "./supabase/admin";

const CARD = 26;
const PAGE = 2000;

function metalDe(m: string | null): "oro" | "plata" | "otro" {
  const k = (m || "").toUpperCase();
  if (k.startsWith("AU") || k.includes("ORO")) return "oro";
  if (k.startsWith("AG") || k.includes("PLATA")) return "plata";
  return "otro";
}
const n = (v: unknown) => (v == null || v === "" ? null : Number(v));

async function cargarQuery() {
  const base = process.env.METABASE_URL!;
  const key = process.env.METABASE_API_KEY!;
  const c = await (await fetch(`${base}/api/card/${CARD}`, { headers: { "x-api-key": key } })).json();
  return c.dataset_query;
}

async function fetchPagina(baseQuery: any, page: number) {
  const base = process.env.METABASE_URL!;
  const key = process.env.METABASE_API_KEY!;
  const ID = ["field", "id", { "base-type": "type/UUID" }];
  const q = JSON.parse(JSON.stringify(baseQuery));
  delete q.query.limit;
  q.query["order-by"] = [["asc", ID]];
  q.query.page = { page, items: PAGE };
  const res = await fetch(`${base}/api/dataset`, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(q),
    cache: "no-store",
  });
  const j = await res.json();
  if (j.error) throw new Error(String(j.error).slice(0, 300));
  const cols: string[] = j.data.cols.map((c: any) => c.display_name || c.name);
  const idx = Object.fromEntries(cols.map((c, i) => [c, i]));
  return { rows: j.data.rows as any[][], idx };
}

export interface RentSyncResult { ok: boolean; filas: number; paginas: number; error?: string }

export async function sincronizarRentabilidad(
  triggeredBy: string,
  onProgress?: (p: { fase: string; actual: number; total: number; etiqueta: string }) => void
): Promise<RentSyncResult> {
  const admin = createAdminClient();
  const { data: logRow } = await admin
    .from("sync_log")
    .insert({ triggered_by: `${triggeredBy} (rentabilidad)`, status: "running" })
    .select("id").single();
  const logId = logRow?.id;

  let total = 0;
  let paginas = 0;

  try {
    const baseQuery = await cargarQuery();
    // Recarga completa: vaciar la tabla antes de insertar
    await admin.from("ventas_rentabilidad").delete().gte("pk", 0);
    onProgress?.({ fase: "rentabilidad", actual: 0, total: 1, etiqueta: "Productos vendidos…" });
    for (let page = 1; ; page++) {
      const { rows, idx } = await fetchPagina(baseQuery, page);
      if (!rows.length) break;
      paginas++;
      const canon = rows.map((r) => ({
        id_producto: r[idx["ID"] ?? idx["id"]],
        fecha: r[idx["Fecha de la venta"]] || null,
        codigo_venta: r[idx["Código de la venta"]],
        codigo_producto: r[idx["Código del producto vendido"]],
        familia: r[idx["Familia del producto"]],
        metal: metalDe(r[idx["Metal del producto"]]),
        origen_metal: r[idx["Origen del metal"]],
        tienda: r[idx["Tienda"]],
        empleado: r[idx["Empleado"]],
        metodo_pago: r[idx["Método de pago"]],
        coste: n(r[idx["Precio de coste"]]),
        // Precio por LÍNEA de producto (= base + IGIC). "Total de la venta" es el
        // total del ticket repetido en cada línea → inflaría los ingresos.
        venta: n(r[idx["Precio final del producto"]]),
        total_recibido: null,
        devolucion: null,
        base_imponible: n(r[idx["Base Imponible"]]),
        cuota_igic: n(r[idx["Cuota IGIC"]]),
        igic_pct: n(r[idx["IGIC"]]),
        descuento: n(r[idx["Descuento Aplicado"]]),
        cliente: r[idx["customer_full_name"]] ?? null,
      }));
      const { error } = await admin.from("ventas_rentabilidad").insert(canon);
      if (error) throw new Error(error.message);
      total += canon.length;
      onProgress?.({ fase: "rentabilidad", actual: total, total: Math.max(total, total + 1), etiqueta: `Rentabilidad · ${total.toLocaleString("es-ES")} líneas` });
      if (rows.length < PAGE) break;
    }

    if (logId) await admin.from("sync_log").update({ finished_at: new Date().toISOString(), status: "ok", rows_total: total, detail: { paginas } }).eq("id", logId);
    return { ok: true, filas: total, paginas };
  } catch (e) {
    if (logId) await admin.from("sync_log").update({ finished_at: new Date().toISOString(), status: "error", rows_total: total, detail: { error: (e as Error).message } }).eq("id", logId);
    return { ok: false, filas: total, paginas, error: (e as Error).message };
  }
}
