import { createClient } from "./supabase/server";

export async function comprasSum(reporte: string, col: string): Promise<number> {
  const sb = await createClient();
  const { data } = await sb.rpc("compras_sum", { p_reporte: reporte, p_col: col });
  return Number(data ?? 0);
}

export async function comprasTotal(reporte: string): Promise<number> {
  const sb = await createClient();
  const { data } = await sb.rpc("compras_total", { p_reporte: reporte });
  return Number(data ?? 0);
}

export async function comprasDesglose(
  reporte: string, dim: string, metrica: string
): Promise<{ etiqueta: string; valor: number; filas: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("compras_desglose", { p_reporte: reporte, p_dim: dim, p_metrica: metrica });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function comprasConteo(
  reporte: string, col: string
): Promise<{ etiqueta: string; filas: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("compras_conteo", { p_reporte: reporte, p_col: col });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

/** Filas crudas (limitadas) para la tabla. */
export async function comprasFilas(reporte: string, limite = 8000): Promise<Record<string, unknown>[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("compras_filas")
    .select("fila")
    .eq("reporte", reporte)
    .range(0, limite - 1);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.fila as Record<string, unknown>);
}
