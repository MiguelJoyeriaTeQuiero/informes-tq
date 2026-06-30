"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function guardarBonoConfig(eurGOro: number, eurGPlata: number) {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "admin" && profile?.role !== "financiero")
    return { ok: false, error: "Sin permiso" };
  const admin = createAdminClient();
  const { error } = await admin.from("bono_config").upsert({
    id: 1, eur_g_oro: eurGOro, eur_g_plata: eurGPlata, updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/bono");
  return { ok: true, error: null };
}
