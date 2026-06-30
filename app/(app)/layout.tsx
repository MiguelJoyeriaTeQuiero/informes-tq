import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MetalsWidget } from "@/components/metals-widget";
import { getSessionProfile, puede } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar permisos={{ config: puede(profile, "config") }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          metals={<Suspense fallback={null}><MetalsWidget /></Suspense>}
          profile={profile}
          email={user.email}
          permisos={{ config: puede(profile, "config") }}
        />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
