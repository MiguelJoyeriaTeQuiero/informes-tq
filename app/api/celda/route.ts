import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRangoFechas } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getSessionProfile();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const operacion = url.searchParams.get("operacion") || "ventas";
  const dow = parseInt(url.searchParams.get("dow") || "0");
  const hora = parseInt(url.searchParams.get("hora") || "0");
  const tienda = url.searchParams.get("tienda") || null;

  // Mismo periodo que el mapa de calor: últimos 12 meses
  const rango = await getRangoFechas();
  const ref = rango.max ? new Date(rango.max) : new Date();
  const desde = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 11, 1)).toISOString();
  const hasta = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 1)).toISOString();

  const sb = await createClient();
  const { data, error } = await sb.rpc("detalle_celda", {
    p_operacion: operacion, p_dow: dow, p_hora: hora, desde, hasta, p_tienda: tienda,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ filas: data ?? [] });
}
