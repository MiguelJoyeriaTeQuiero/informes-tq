import { NextResponse, type NextRequest } from "next/server";
import { getSessionProfile, puede } from "@/lib/auth";
import {
  getKpis,
  getSerieMensual,
  getRanking,
  rangoMes,
} from "@/lib/queries";
import { getPreciosMetales } from "@/lib/metals";
import { generarPptx } from "@/lib/ppt";
import { MESES } from "@/lib/format";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const { user, profile } = await getSessionProfile();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!puede(profile, "ppt"))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const url = new URL(req.url);
  const ahora = new Date();
  const anio = parseInt(url.searchParams.get("anio") ?? `${ahora.getUTCFullYear()}`);
  const mes = parseInt(url.searchParams.get("mes") ?? `${ahora.getUTCMonth()}`);

  const { desde, hasta } = rangoMes(anio, mes);
  const prev = rangoMes(anio - 1, mes);
  const desde12 = new Date(Date.UTC(anio, mes - 11, 1)).toISOString();

  try {
    const [kpis, kpisPrev, serie, rkTienda, rkEmpleado, metales] = await Promise.all([
      getKpis(desde, hasta),
      getKpis(prev.desde, prev.hasta),
      getSerieMensual("todas", desde12, hasta),
      getRanking("ventas", "tienda", desde, hasta, 8),
      getRanking("ventas", "empleado", desde, hasta, 8),
      getPreciosMetales(),
    ]);

    const buffer = await generarPptx({
      anio, mes, kpis, kpisPrev, serie, rkTienda, rkEmpleado, metales,
    });

    const nombre = `Comite_TeQuiero_${MESES[mes]}_${anio}.pptx`;
    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${nombre}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
