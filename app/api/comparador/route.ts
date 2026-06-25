import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { getKpis, getSerieMensual } from "@/lib/queries";
import type { OperacionKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getSessionProfile();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const operacion = (url.searchParams.get("operacion") || "todas") as
    | OperacionKey
    | "todas";
  const anios = (url.searchParams.get("anios") || "")
    .split(",")
    .map((a) => parseInt(a))
    .filter((a) => !Number.isNaN(a))
    .slice(0, 6);

  if (!anios.length) return NextResponse.json({ anios: [] });

  try {
    const resultados = await Promise.all(
      anios.map(async (anio) => {
        const desde = new Date(Date.UTC(anio, 0, 1)).toISOString();
        const hasta = new Date(Date.UTC(anio + 1, 0, 1)).toISOString();
        const [kpis, serie] = await Promise.all([
          getKpis(desde, hasta),
          getSerieMensual(operacion, desde, hasta),
        ]);

        const k =
          operacion === "todas"
            ? {
                euros: kpis.reduce((s, r) => s + Number(r.euros), 0),
                unidades: kpis.reduce((s, r) => s + Number(r.unidades), 0),
                gramos_oro: kpis.reduce((s, r) => s + Number(r.gramos_oro), 0),
                gramos_plata: kpis.reduce((s, r) => s + Number(r.gramos_plata), 0),
              }
            : (() => {
                const r = kpis.find((x) => x.operacion === operacion);
                return {
                  euros: Number(r?.euros ?? 0),
                  unidades: Number(r?.unidades ?? 0),
                  gramos_oro: Number(r?.gramos_oro ?? 0),
                  gramos_plata: Number(r?.gramos_plata ?? 0),
                };
              })();

        const meses = Array.from({ length: 12 }, () => ({ euros: 0, unidades: 0 }));
        for (const s of serie) {
          const m = new Date(s.mes).getUTCMonth();
          meses[m] = { euros: Number(s.euros), unidades: Number(s.unidades) };
        }

        return { anio, ...k, meses };
      })
    );

    return NextResponse.json({ operacion, anios: resultados });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
