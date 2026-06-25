import { createClient } from "./supabase/server";
import type { Profile } from "./types";

export async function getSessionProfile(): Promise<{
  user: { id: string; email?: string } | null;
  profile: Profile | null;
}> {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    user: { id: user.id, email: user.email },
    profile: (profile as Profile) ?? null,
  };
}

export function puede(profile: Profile | null, permiso: string): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  const mapa: Record<string, string[]> = {
    config: ["admin"],
    usuarios: ["admin"],
    sync: ["admin", "financiero"],
    ppt: ["admin", "financiero", "direccion"],
  };
  return mapa[permiso]?.includes(profile.role) ?? true;
}
