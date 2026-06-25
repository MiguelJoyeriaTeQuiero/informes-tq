import { createClient } from "./supabase/server";

export interface StockResumen {
  piezas: number;
  valor_pvp: number;
  valor_coste: number;
  peso_oro: number;
  peso_plata: number;
  peso_total: number;
}
export interface StockDim {
  etiqueta: string;
  piezas: number;
  valor_pvp: number;
  valor_coste: number;
  peso_g: number;
}
export interface StockAging {
  tramo: string;
  orden: number;
  piezas: number;
  valor_coste: number;
  valor_pvp: number;
}

function arr(estados: string[] | null) {
  return estados && estados.length ? estados : null;
}

export async function getStockResumen(estados: string[] | null): Promise<StockResumen> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("stock_resumen", { p_estados: arr(estados) });
  if (error) throw new Error(error.message);
  const r = (data ?? [])[0] ?? {};
  return {
    piezas: Number(r.piezas ?? 0),
    valor_pvp: Number(r.valor_pvp ?? 0),
    valor_coste: Number(r.valor_coste ?? 0),
    peso_oro: Number(r.peso_oro ?? 0),
    peso_plata: Number(r.peso_plata ?? 0),
    peso_total: Number(r.peso_total ?? 0),
  };
}

export async function getStockPorDim(
  estados: string[] | null,
  dim: "status" | "store_name" | "familia" | "metal" | "metal_source" | "karat"
): Promise<StockDim[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("stock_por_dim", { p_estados: arr(estados), p_dim: dim });
  if (error) throw new Error(error.message);
  return (data ?? []) as StockDim[];
}

export async function getStockAging(estados: string[] | null): Promise<StockAging[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("stock_aging", { p_estados: arr(estados) });
  if (error) throw new Error(error.message);
  return (data ?? []) as StockAging[];
}

export async function getStockEstados(): Promise<{ status: string; piezas: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("stock_estados");
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function getStockEvolucion(
  estados: string[] | null
): Promise<{ snapshot_date: string; valor_coste: number; valor_pvp: number; piezas: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("stock_evolucion", { p_estados: arr(estados) });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}
