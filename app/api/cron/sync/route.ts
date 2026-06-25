import { NextResponse, type NextRequest } from "next/server";
import { sincronizarTodo } from "@/lib/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Endpoint del cron diario (L-V 08:00). Protegido por CRON_SECRET.
 * Vercel Cron envía `Authorization: Bearer <CRON_SECRET>` automáticamente.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const secret = process.env.CRON_SECRET;

  const autorizado =
    !!secret && (auth === `Bearer ${secret}` || token === secret);

  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const res = await sincronizarTodo("cron");
    return NextResponse.json({ ...res, ranAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
