import { createAdminClient } from "./supabase/admin";
import { OPERACION_LIST, STOCK_CARD } from "./types";

export interface FuenteSync {
  key: string;
  label: string;
  card_id: number;
  metabase_nombre: string | null;
  tipo: "operacion" | "stock";
  activo: boolean;
  orden: number;
}

/** Lista por defecto (constantes) si la tabla aún no existe. */
function fallback(): FuenteSync[] {
  return [
    ...OPERACION_LIST.map((o, i) => ({
      key: o.key, label: o.label, card_id: o.cardId,
      metabase_nombre: o.metabaseNombre, tipo: "operacion" as const, activo: true, orden: i + 1,
    })),
    {
      key: "stock", label: STOCK_CARD.label, card_id: STOCK_CARD.cardId,
      metabase_nombre: STOCK_CARD.metabaseNombre, tipo: "stock" as const, activo: true, orden: 99,
    },
  ];
}

/** Lee las fuentes desde BD; si la tabla no existe, usa las constantes. */
export async function getFuentes(): Promise<FuenteSync[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("metabase_sources").select("*").order("orden");
    if (error || !data?.length) return fallback();
    return data as FuenteSync[];
  } catch {
    return fallback();
  }
}
