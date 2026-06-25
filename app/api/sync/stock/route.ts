import { getSessionProfile, puede } from "@/lib/auth";
import { sincronizarStock } from "@/lib/stock-sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  const { user, profile } = await getSessionProfile();
  if (!user) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  if (!puede(profile, "sync"))
    return new Response(JSON.stringify({ error: "Sin permiso" }), { status: 403 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const res = await sincronizarStock(user.email ?? "manual", (p) =>
          send({ type: "progress", ...p })
        );
        send({ type: "done", result: res });
      } catch (e) {
        send({ type: "error", error: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
