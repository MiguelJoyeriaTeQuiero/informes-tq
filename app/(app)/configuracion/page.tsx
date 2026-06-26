import { redirect } from "next/navigation";
import { getSessionProfile, puede } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SyncPanel } from "@/components/config/sync-panel";
import { MetabaseCardsPanel } from "@/components/config/metabase-cards-panel";
import { UsersPanel } from "@/components/config/users-panel";
import { RolesPanel } from "@/components/config/roles-panel";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const { profile } = await getSessionProfile();
  if (!puede(profile, "config")) redirect("/");

  const sb = await createClient();
  const [{ data: usuarios }, { data: roles }, { data: logs }] = await Promise.all([
    sb.from("profiles").select("*").order("created_at", { ascending: true }),
    sb.from("roles").select("name,label").order("name"),
    sb.from("sync_log").select("*").order("started_at", { ascending: false }).limit(1),
  ]);

  return (
    <div className="space-y-6">
      <SyncPanel ultima={logs?.[0] ?? null} />
      <MetabaseCardsPanel metabaseUrl={process.env.METABASE_URL ?? ""} />
      <UsersPanel
        usuarios={(usuarios as Profile[]) ?? []}
        roles={roles ?? []}
      />
      <RolesPanel roles={roles ?? []} />
    </div>
  );
}
