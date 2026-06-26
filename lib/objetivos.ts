import { createClient } from "./supabase/server";

export async function getObjetivos(anio: number, mes: number): Promise<Record<string, number>> {
  const sb = await createClient();
  const { data } = await sb.from("objetivos").select("ambito,objetivo").eq("anio", anio).eq("mes", mes);
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[(r as any).ambito] = Number((r as any).objetivo);
  return out;
}

export function semaforo(pct: number): "verde" | "ambar" | "rojo" {
  if (pct >= 1) return "verde";
  if (pct >= 0.8) return "ambar";
  return "rojo";
}
