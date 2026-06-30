import Anthropic from "@anthropic-ai/sdk";
import { getSessionProfile } from "@/lib/auth";
import { getKpis, getRanking, getSerieMensual, getTiendas, getRangoFechas } from "@/lib/queries";
import { rentResumen } from "@/lib/finanzas-queries";
import { getStockResumen } from "@/lib/stock-queries";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "kpis_operaciones",
    description: "KPIs (importe €, gramos de oro/plata, nº operaciones) de cada operación en un rango de fechas. Opcionalmente filtra por tienda.",
    input_schema: {
      type: "object",
      properties: {
        desde: { type: "string", description: "Fecha inicio ISO (incluida)" },
        hasta: { type: "string", description: "Fecha fin ISO (excluida)" },
        tienda: { type: "string", description: "Nombre de tienda (opcional)" },
      },
      required: ["desde", "hasta"],
    },
  },
  {
    name: "ranking",
    description: "Ranking por dimensión (importe €) de una operación en un rango.",
    input_schema: {
      type: "object",
      properties: {
        operacion: { type: "string", enum: ["ventas", "compras", "reservas", "recuperables", "trabajos", "todas"] },
        dimension: { type: "string", enum: ["tienda", "empleado", "familia_prenda", "plataforma"] },
        desde: { type: "string" }, hasta: { type: "string" },
        limite: { type: "integer", description: "Máximo de filas (por defecto 10)" },
        tienda: { type: "string" },
      },
      required: ["operacion", "dimension", "desde", "hasta"],
    },
  },
  {
    name: "serie_mensual",
    description: "Evolución mensual (importe €, gramos, operaciones) de una operación en un rango.",
    input_schema: {
      type: "object",
      properties: {
        operacion: { type: "string", enum: ["ventas", "compras", "reservas", "recuperables", "trabajos", "todas"] },
        desde: { type: "string" }, hasta: { type: "string" }, tienda: { type: "string" },
      },
      required: ["operacion", "desde", "hasta"],
    },
  },
  {
    name: "rentabilidad",
    description: "Rentabilidad real (ingresos, coste de ventas, margen bruto, base imponible, cuota IGIC) en un rango.",
    input_schema: {
      type: "object",
      properties: { desde: { type: "string" }, hasta: { type: "string" } },
      required: ["desde", "hasta"],
    },
  },
  {
    name: "stock_resumen",
    description: "Resumen de existencias: piezas, valor a coste y a PVP, gramos de oro/plata. Por defecto estado DIS (disponible).",
    input_schema: {
      type: "object",
      properties: { estados: { type: "array", items: { type: "string" }, description: "p.ej. ['DIS'] o ['DIS','RES']" } },
    },
  },
  {
    name: "lista_tiendas",
    description: "Lista de nombres de tiendas disponibles.",
    input_schema: { type: "object", properties: {} },
  },
];

async function ejecutar(name: string, input: any): Promise<unknown> {
  try {
    switch (name) {
      case "kpis_operaciones": return await getKpis(input.desde, input.hasta, input.tienda ?? null);
      case "ranking": return await getRanking(input.operacion, input.dimension, input.desde, input.hasta, input.limite ?? 10, input.tienda ?? null);
      case "serie_mensual": return await getSerieMensual(input.operacion, input.desde, input.hasta, input.tienda ?? null);
      case "rentabilidad": return await rentResumen(input.desde, input.hasta);
      case "stock_resumen": return await getStockResumen(input.estados ?? ["DIS"]);
      case "lista_tiendas": return await getTiendas();
      default: return { error: "herramienta desconocida" };
    }
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function POST(req: Request) {
  const { user } = await getSessionProfile();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json({ error: "El asistente no está configurado: falta ANTHROPIC_API_KEY." }, { status: 503 });

  const body = await req.json();
  const incoming = (body.messages ?? []) as { role: "user" | "assistant"; content: string }[];
  if (!incoming.length) return Response.json({ error: "Sin pregunta" }, { status: 400 });

  const rango = await getRangoFechas();
  const hoy = new Date().toISOString().slice(0, 10);
  const system = `Eres el analista financiero virtual de Joyerías Te Quiero (Canarias). Respondes en español, con cifras en euros (€) y gramos (g).
Hoy es ${hoy}. Los datos disponibles van de ${rango.min?.slice(0, 10) ?? "?"} a ${rango.max?.slice(0, 10) ?? "?"}.
Usa SIEMPRE las herramientas para obtener datos reales antes de responder; no inventes cifras. Calcula los rangos de fecha (desde incluido, hasta excluido) a partir de la pregunta. Las operaciones son: ventas, compras, reservas, recuperables, trabajos. El impuesto es IGIC (no IVA).
Responde de forma directa y concisa: da la cifra y un breve contexto. Si la pregunta es ambigua, asume el periodo más razonable y dilo. No muestres tu razonamiento interno.`;

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = incoming.map((m) => ({ role: m.role, content: m.content }));

  try {
    for (let i = 0; i < 6; i++) {
      const resp = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 2000,
        system,
        tools: TOOLS,
        messages,
      });
      if (resp.stop_reason === "refusal") return Response.json({ answer: "No puedo ayudar con esa petición." });
      if (resp.stop_reason !== "tool_use") {
        const text = resp.content.filter((b) => b.type === "text").map((b: any) => b.text).join("\n").trim();
        return Response.json({ answer: text || "(sin respuesta)" });
      }
      messages.push({ role: "assistant", content: resp.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const block of resp.content) {
        if (block.type === "tool_use") {
          const data = await ejecutar(block.name, block.input);
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(data) });
        }
      }
      messages.push({ role: "user", content: results });
    }
    return Response.json({ answer: "No he podido completar la consulta (demasiados pasos)." });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
