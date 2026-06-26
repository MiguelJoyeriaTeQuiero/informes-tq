import { createClient } from "./supabase/server";

export interface RentResumen {
  ingresos: number; coste: number; margen: number; unidades: number;
  base_imponible: number; cuota_igic: number; devoluciones: number; descuentos: number;
}
export interface RentDesgloseRow {
  etiqueta: string; ingresos: number; coste: number; margen: number; unidades: number;
}

export async function rentResumen(desde: string, hasta: string): Promise<RentResumen> {
  const sb = await createClient();
  const { data } = await sb.rpc("rent_resumen", { desde, hasta });
  const r = (data ?? [])[0] ?? {};
  return {
    ingresos: Number(r.ingresos ?? 0), coste: Number(r.coste ?? 0), margen: Number(r.margen ?? 0),
    unidades: Number(r.unidades ?? 0), base_imponible: Number(r.base_imponible ?? 0),
    cuota_igic: Number(r.cuota_igic ?? 0), devoluciones: Number(r.devoluciones ?? 0), descuentos: Number(r.descuentos ?? 0),
  };
}

export async function rentSerie(desde: string, hasta: string): Promise<{ mes: string; ingresos: number; coste: number; margen: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("rent_serie", { desde, hasta });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function rentDesglose(dim: string, desde: string, hasta: string): Promise<RentDesgloseRow[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("rent_desglose", { p_dim: dim, desde, hasta });
  if (error) throw new Error(error.message);
  return (data ?? []) as RentDesgloseRow[];
}

export async function rentFiscal(desde: string, hasta: string): Promise<{ igic_pct: number; base_imponible: number; cuota_igic: number; total: number; unidades: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("rent_fiscal", { desde, hasta });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}
