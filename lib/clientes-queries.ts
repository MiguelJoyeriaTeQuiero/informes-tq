import { createClient } from "./supabase/server";

export interface ClientesResumen {
  total: number; recurrentes: number; ltv_medio: number; ticket_medio: number; con_email: number;
}

export async function clientesResumen(): Promise<ClientesResumen> {
  const sb = await createClient();
  const { data } = await sb.rpc("clientes_resumen");
  const r = (data ?? [])[0] ?? {};
  return {
    total: Number(r.total ?? 0), recurrentes: Number(r.recurrentes ?? 0),
    ltv_medio: Number(r.ltv_medio ?? 0), ticket_medio: Number(r.ticket_medio ?? 0),
    con_email: Number(r.con_email ?? 0),
  };
}

export async function clientesRfm(): Promise<{ segmento: string; clientes: number; monetario: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("clientes_rfm");
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function clientesTop(limit = 20): Promise<{ cliente: string; provincia: string; frecuencia: number; monetario: number; ultima: string }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("clientes_top", { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function clientesGeo(): Promise<{ provincia: string; clientes: number; importe: number }[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("clientes_geo");
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}

export async function clientesEmailList(limit = 5000): Promise<Record<string, unknown>[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("clientes_email_list", { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []) as any[];
}
