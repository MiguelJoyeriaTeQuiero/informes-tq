import { unstable_cache } from "next/cache";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import type { OperacionKey } from "./types";

export interface KpiRow {
  operacion: OperacionKey;
  euros: number;
  gramos_oro: number;
  gramos_plata: number;
  gramos_total: number;
  unidades: number;
}

export interface SerieRow {
  mes: string;
  euros: number;
  gramos: number;
  unidades: number;
  gramos_oro: number;
  gramos_plata: number;
}

export interface RankingRow {
  etiqueta: string;
  euros: number;
  gramos: number;
  unidades: number;
}

// La lista de tiendas cambia poco → se cachea 1h (usa service role, sin cookies)
export const getTiendas = unstable_cache(
  async (): Promise<string[]> => {
    const admin = createAdminClient();
    const { data } = await admin.rpc("tiendas");
    return (data ?? [])
      .map((r: any) => r.tienda as string)
      .filter((t: string) => t && t.toLowerCase() !== "null");
  },
  ["lista-tiendas"],
  { revalidate: 3600 }
);

export async function getKpis(desde: string, hasta: string, tienda?: string | null): Promise<KpiRow[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("kpis_por_operacion", { desde, hasta, p_tienda: tienda ?? null });
  if (error) throw new Error(error.message);
  return (data ?? []) as KpiRow[];
}

export async function getSerieMensual(
  operacion: OperacionKey | "todas",
  desde: string,
  hasta: string,
  tienda?: string | null
): Promise<SerieRow[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("serie_mensual", {
    p_operacion: operacion, desde, hasta, p_tienda: tienda ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as SerieRow[];
}

export async function getRanking(
  operacion: OperacionKey | "todas",
  dim: "tienda" | "empleado" | "familia_prenda" | "plataforma",
  desde: string,
  hasta: string,
  limit = 10,
  tienda?: string | null
): Promise<RankingRow[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("ranking", {
    p_operacion: operacion, p_dim: dim, desde, hasta, p_limit: limit, p_tienda: tienda ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as RankingRow[];
}

export type DimAnalitica =
  | "tienda"
  | "empleado"
  | "familia_prenda"
  | "plataforma"
  | "metodo_pago"
  | "tipo_operacion"
  | "quilate_prenda"
  | "origen_metal";

export interface DesgloseRow {
  etiqueta: string;
  euros: number;
  unidades: number;
  gramos_oro: number;
  gramos_plata: number;
  peso_total: number;
}

export interface FilaAnalitica {
  etiqueta: string;
  euros: number;
  unidades: number;
  ticket: number;
  gramosOro: number;
  gramosPlata: number;
  pesoTotal: number;
  pctEuros: number;
  variacion: number | null; // variación interanual de euros
}

export async function getSerieDiaria(
  operacion: OperacionKey | "todas",
  desde: string,
  hasta: string,
  tienda?: string | null
): Promise<{ dia: string; euros: number; unidades: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("serie_diaria", {
    p_operacion: operacion, desde, hasta, p_tienda: tienda ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

async function getDesglose(
  operacion: OperacionKey | "todas",
  dim: DimAnalitica,
  desde: string,
  hasta: string,
  tienda?: string | null
): Promise<DesgloseRow[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("desglose", {
    p_operacion: operacion, p_dim: dim, desde, hasta, p_tienda: tienda ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as DesgloseRow[];
}

/** Desglose por dimensión con % sobre total, ticket medio y variación interanual por fila. */
export async function getDesgloseAnalitico(
  operacion: OperacionKey | "todas",
  dim: DimAnalitica,
  desde: string,
  hasta: string,
  prevDesde: string,
  prevHasta: string,
  tienda?: string | null
): Promise<FilaAnalitica[]> {
  const [actual, anterior] = await Promise.all([
    getDesglose(operacion, dim, desde, hasta, tienda),
    getDesglose(operacion, dim, prevDesde, prevHasta, tienda),
  ]);
  const totalEuros = actual.reduce((s, r) => s + Math.abs(Number(r.euros)), 0) || 1;
  const prevMap = new Map(anterior.map((r) => [r.etiqueta, Number(r.euros)]));

  return actual.map((r) => {
    const euros = Number(r.euros);
    const unidades = Number(r.unidades);
    const prev = prevMap.get(r.etiqueta);
    return {
      etiqueta: r.etiqueta,
      euros,
      unidades,
      ticket: unidades ? euros / unidades : 0,
      gramosOro: Number(r.gramos_oro),
      gramosPlata: Number(r.gramos_plata),
      pesoTotal: Number(r.peso_total),
      pctEuros: Math.abs(euros) / totalEuros,
      variacion: prev ? (euros - prev) / Math.abs(prev) : null,
    };
  });
}

/** Todos los desgloses (varias dimensiones) en 2 llamadas: actual + año anterior. */
export async function getDesglosesMulti(
  operacion: OperacionKey | "todas",
  dims: DimAnalitica[],
  desde: string,
  hasta: string,
  prevDesde: string,
  prevHasta: string,
  tienda?: string | null
): Promise<Record<string, FilaAnalitica[]>> {
  const sb = await createClient();
  const [{ data: actual }, { data: anterior }] = await Promise.all([
    sb.rpc("desglose_multi", { p_operacion: operacion, p_dims: dims, desde, hasta, p_tienda: tienda ?? null }),
    sb.rpc("desglose_multi", { p_operacion: operacion, p_dims: dims, desde: prevDesde, hasta: prevHasta, p_tienda: tienda ?? null }),
  ]);
  const prevMap = new Map<string, number>();
  for (const r of (anterior ?? []) as any[]) prevMap.set(`${r.dim}|${r.etiqueta}`, Number(r.euros));
  const totByDim: Record<string, number> = {};
  for (const r of (actual ?? []) as any[]) totByDim[r.dim] = (totByDim[r.dim] || 0) + Math.abs(Number(r.euros));

  const out: Record<string, FilaAnalitica[]> = {};
  for (const d of dims) out[d] = [];
  for (const r of (actual ?? []) as any[]) {
    const euros = Number(r.euros), unidades = Number(r.unidades);
    const prev = prevMap.get(`${r.dim}|${r.etiqueta}`);
    const tot = totByDim[r.dim] || 1;
    (out[r.dim] ||= []).push({
      etiqueta: r.etiqueta, euros, unidades,
      ticket: unidades ? euros / unidades : 0,
      gramosOro: Number(r.gramos_oro), gramosPlata: Number(r.gramos_plata), pesoTotal: Number(r.peso_total),
      pctEuros: Math.abs(euros) / tot,
      variacion: prev ? (euros - prev) / Math.abs(prev) : null,
    });
  }
  return out;
}

export async function getActividadSemana(
  operacion: OperacionKey | "todas",
  desde: string,
  hasta: string,
  tienda?: string | null
): Promise<{ dow: number; euros: number; unidades: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("actividad_semana", {
    p_operacion: operacion, desde, hasta, p_tienda: tienda ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function getMapaCalor(
  operacion: OperacionKey | "todas",
  desde: string,
  hasta: string,
  tienda?: string | null
): Promise<{ tienda: string; dow: number; hora: number; euros: number; unidades: number; gramos: number; gramos_oro: number; gramos_plata: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("mapa_calor", {
    p_operacion: operacion, desde, hasta, p_tienda: tienda ?? null,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export interface KpisExtra {
  tiendas_activas: number;
  empleados_activos: number;
  peso_medio: number;
  ticket_max: number;
  euros_oro: number;
  euros_plata: number;
}

export async function getKpisExtra(
  operacion: OperacionKey | "todas",
  desde: string,
  hasta: string,
  tienda?: string | null
): Promise<KpisExtra> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("kpis_extra", {
    p_operacion: operacion, desde, hasta, p_tienda: tienda ?? null,
  });
  if (error) throw new Error(error.message);
  const r = (data ?? [])[0] ?? {};
  return {
    tiendas_activas: Number(r.tiendas_activas ?? 0),
    empleados_activos: Number(r.empleados_activos ?? 0),
    peso_medio: Number(r.peso_medio ?? 0),
    ticket_max: Number(r.ticket_max ?? 0),
    euros_oro: Number(r.euros_oro ?? 0),
    euros_plata: Number(r.euros_plata ?? 0),
  };
}

export async function getRangoFechas(): Promise<{ min: string | null; max: string | null }> {
  const sb = await createClient();
  const { data } = await sb.rpc("rango_fechas");
  const row = (data ?? [])[0] as { min_fecha: string; max_fecha: string } | undefined;
  return { min: row?.min_fecha ?? null, max: row?.max_fecha ?? null };
}

/** Devuelve [desde, hasta) para un mes/año concretos. */
export function rangoMes(anio: number, mes0: number): { desde: string; hasta: string } {
  const desde = new Date(Date.UTC(anio, mes0, 1)).toISOString();
  const hasta = new Date(Date.UTC(anio, mes0 + 1, 1)).toISOString();
  return { desde, hasta };
}
