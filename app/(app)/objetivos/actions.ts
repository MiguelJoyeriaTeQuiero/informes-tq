"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function exigirGestor() {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "admin" && profile?.role !== "financiero")
    throw new Error("Solo administradores o el director financiero pueden fijar objetivos.");
}

export async function guardarObjetivo(anio: number, mes: number, ambito: string, objetivo: number) {
  try {
    await exigirGestor();
    const admin = createAdminClient();
    const { error } = await admin
      .from("objetivos")
      .upsert({ anio, mes, ambito, objetivo, updated_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/objetivos");
    revalidatePath("/");
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
