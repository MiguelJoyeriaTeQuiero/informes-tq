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
  /** clave en el JSON histórico (app vieja) */
  jsonKey: string;
}

export const OPERACIONES: Record<OperacionKey, OperacionMeta> = {
  ventas:       { key: "ventas",       label: "Ventas",              cardId: 379, jsonKey: "v" },
  compras:      { key: "compras",      label: "Compras",             cardId: 310, jsonKey: "c" },
  reservas:     { key: "reservas",     label: "Reservas",            cardId: 298, jsonKey: "r" },
  recuperables: { key: "recuperables", label: "Ventas Recuperables", cardId: 314, jsonKey: "rec" },
  trabajos:     { key: "trabajos",     label: "Trabajos",            cardId: 312, jsonKey: "t" },
};

export const OPERACION_LIST = Object.values(OPERACIONES);

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
