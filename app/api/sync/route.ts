import { NextResponse } from "next/server";
import { getSessionProfile, puede } from "@/lib/auth";
import { sincronizarTodo } from "@/lib/sync";

export const maxDuration = 300;

export async function POST() {
  const { user, profile } = await getSessionProfile();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!puede(profile, "sync"))
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  try {
    const res = await sincronizarTodo(user.email ?? "manual");
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
