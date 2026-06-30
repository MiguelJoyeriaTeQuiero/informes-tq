import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { getSerieMensual, getRangoFechas } from "@/lib/queries";
import { MESES } from "@/lib/format";
import type { OperacionKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getSessionProfile();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const operacion = (url.searchParams.get("operacion") || "ventas") as OperacionKey | "todas";
  const tiendas = (url.searchParams.get("tiendas") || "")
    .split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);

  if (!tiendas.length) return NextResponse.json({ meses: [], tiendas: [] });

  const rango = await getRangoFechas();
  const ref = rango.max ? new Date(rango.max) : new Date();
  const anioRef = ref.getUTCFullYear(), mesRef = ref.getUTCMonth();
  const desde12 = new Date(Date.UTC(anioRef, mesRef - 11, 1)).toISOString();
  const hasta = new Date(Date.UTC(anioRef, mesRef + 1, 1)).toISOString();

  // Eje de 12 meses
  const eje: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(anioRef, mesRef - i, 1));
    eje.push({ key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: `${MESES[d.getUTCMonth()].slice(0, 3)} ${String(d.getUTCFullYear()).slice(2)}` });
  }

  try {
    const resultados = await Promise.all(
      tiendas.map(async (tienda) => {
        const serie = await getSerieMensual(operacion, desde12, hasta, tienda);
        const map = new Map<string, { euros: number; gramos: number; unidades: number }>();
        for (const s of serie) {
          const d = new Date(s.mes);
          map.set(`${d.getUTCFullYear()}-${d.getUTCMonth()}`, { euros: Number(s.euros), gramos: Number(s.gramos), unidades: Number(s.unidades) });
        }
        const euros: number[] = [], gramos: number[] = [], unidades: number[] = [];
        for (const e of eje) { const v = map.get(e.key); euros.push(v?.euros ?? 0); gramos.push(v?.gramos ?? 0); unidades.push(v?.unidades ?? 0); }
        return {
          tienda, euros, gramos, unidades,
          total: { euros: euros.reduce((a, b) => a + b, 0), gramos: gramos.reduce((a, b) => a + b, 0), unidades: unidades.reduce((a, b) => a + b, 0) },
        };
      })
    );
    return NextResponse.json({ meses: eje.map((e) => e.label), tiendas: resultados });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
