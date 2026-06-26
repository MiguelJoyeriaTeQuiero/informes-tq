export type OperacionKey =
  | "ventas"
  | "compras"
  | "reservas"
  | "recuperables"
  | "trabajos";

export interface OperacionMeta {
  key: OperacionKey;
  label: string;
  cardId: number;
  /** nombre del card guardado en Metabase */
  metabaseNombre: string;
  /** clave en el JSON histórico (app vieja) */
  jsonKey: string;
}

export const OPERACIONES: Record<OperacionKey, OperacionMeta> = {
  ventas:       { key: "ventas",       label: "Ventas",              cardId: 379, metabaseNombre: "Informe de Ventas 2026 - JTQ",              jsonKey: "v" },
  compras:      { key: "compras",      label: "Compras",             cardId: 310, metabaseNombre: "Informe de Compras 2026 - JTQ",             jsonKey: "c" },
  reservas:     { key: "reservas",     label: "Reservas",            cardId: 298, metabaseNombre: "Reservas Dashboard v. 2026",                jsonKey: "r" },
  recuperables: { key: "recuperables", label: "Ventas Recuperables", cardId: 314, metabaseNombre: "Informe de Ventas Recuperables 2026 - JTQ", jsonKey: "rec" },
  trabajos:     { key: "trabajos",     label: "Trabajos",            cardId: 312, metabaseNombre: "Informe de Trabajos 2026 - JTQ",            jsonKey: "t" },
};

export const OPERACION_LIST = Object.values(OPERACIONES);

/** Card de inventario (maestro de productos). */
export const STOCK_CARD = { cardId: 353, metabaseNombre: "Sellable Products", label: "Inventario / Existencias" };

export type Rol = "admin" | "financiero" | "direccion" | "lectura";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Rol;
  created_at: string;
}

export interface KpiOperacion {
  euros: number;
  gramosOro: number;
  gramosPlata: number;
  gramosTotal: number;
  unidades: number;
  ticketMedio: number;
}
