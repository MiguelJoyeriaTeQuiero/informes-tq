import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con SERVICE ROLE — omite RLS. SOLO en código de servidor
 * (sincronización, migración, gestión de usuarios). Nunca importar en cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
