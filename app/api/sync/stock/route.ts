import { NextResponse } from "next/server";
import { getSessionProfile, puede } from "@/lib/auth";
import { sincronizarStock } from "@/lib/stock-sync";

export const maxDuration = 300;

export async function POST() {
  const { user, profile } = await getSessionProfile();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!puede(profile, "sync"))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const res = await sincronizarStock(user.email ?? "manual");
  return NextResponse.json(res, { status: res.ok ? 200 : 500 });
}
