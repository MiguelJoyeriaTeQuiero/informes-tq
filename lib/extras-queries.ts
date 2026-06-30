import { createClient } from "./supabase/server";

export async function getTesoreria(
  desde: string, hasta: string, tienda?: string | null
): Promise<{ mes: string; entradas: number; salidas: number; neto: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("tesoreria", { desde, hasta, p_tienda: tienda ?? null });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export interface BonoFila {
  tienda: string; oro_g: number; plata_g: number;
  oro_nuevo_g: number; oro_ocasion_g: number; importe: number; unidades: number;
}

export async function getBonoBase(desde: string, hasta: string): Promise<BonoFila[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("bono_base", { desde, hasta });
  if (error) throw new Error(error.message);
  return (data ?? []) as BonoFila[];
}

export async function getBonoConfig(): Promise<{ eur_g_oro: number; eur_g_plata: number }> {
  const sb = await createClient();
  const { data } = await sb.from("bono_config").select("eur_g_oro,eur_g_plata").eq("id", 1).single();
  return { eur_g_oro: Number(data?.eur_g_oro ?? 0), eur_g_plata: Number(data?.eur_g_plata ?? 0) };
}

/** Rango de un trimestre (1-4) de un año → [desde, hasta). */
export function rangoTrimestre(anio: number, trimestre: number): { desde: string; hasta: string } {
  const mesIni = (trimestre - 1) * 3;
  return {
    desde: new Date(Date.UTC(anio, mesIni, 1)).toISOString(),
    hasta: new Date(Date.UTC(anio, mesIni + 3, 1)).toISOString(),
  };
}
