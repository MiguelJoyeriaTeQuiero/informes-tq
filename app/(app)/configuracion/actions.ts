"use server";

import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function exigirAdmin() {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "admin") throw new Error("Solo un administrador puede hacer esto.");
}

export async function crearUsuario(_prev: unknown, formData: FormData) {
  try {
    await exigirAdmin();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const full_name = String(formData.get("full_name") || "").trim();
    const role = String(formData.get("role") || "lectura");
    if (!email || password.length < 6)
      return { ok: false, error: "Email válido y contraseña de 6+ caracteres." };

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });
    if (error) return { ok: false, error: error.message };

    // Asegura el perfil (por si el trigger no corre)
    await admin.from("profiles").upsert({
      id: data.user!.id,
      email,
      full_name: full_name || email,
      role,
    });
    revalidatePath("/configuracion");
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function actualizarRol(userId: string, role: string) {
  try {
    await exigirAdmin();
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/configuracion");
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function eliminarUsuario(userId: string) {
  try {
    await exigirAdmin();
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/configuracion");
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function crearRol(_prev: unknown, formData: FormData) {
  try {
    await exigirAdmin();
    const name = String(formData.get("name") || "").trim().toLowerCase().replace(/\s+/g, "_");
    const label = String(formData.get("label") || "").trim();
    if (!name || !label) return { ok: false, error: "Nombre y etiqueta requeridos." };
    const admin = createAdminClient();
    const { error } = await admin.from("roles").upsert({ name, label });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/configuracion");
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
