import crypto from "node:crypto";
import type { OperacionKey } from "./types";

/**
 * Para cada campo canónico (columna de la BD) damos una lista de posibles
 * nombres de columna de origen. Así un mismo mapeo sirve tanto para los datos
 * de Metabase como para el JSON histórico de la app vieja.
 */
type FieldMap = Record<string, string[]>;

const COMUNES: FieldMap = {
  tipo_operacion: ["Tipo operación", "Tipo de operación", "Tipo de transacción RS"],
  fecha_operacion: ["Fecha de operación", "created_at"],
  descripcion_prenda: ["Descripción prenda", "Sellable Products - Código RS__description"],
  familia_prenda: ["Familia prenda", "Sellable Products - Código RS__family"],
  quilate_prenda: ["Quilate prenda", "Sellable Products - Código RS__karat"],
  peso_g: ["Peso prenda (g)", "Peso Gr"],
  pago_eur: ["Pago prenda (€)", "Pago (€)"],
  metodo_pago: ["Método de pago"],
  tienda: ["Tienda", "Stores - Tienda__name"],
  empleado: ["Empleado", "employee_name"],
  plataforma: ["Plataforma", "Platforms__name"],
};

const MAPEOS: Record<OperacionKey, FieldMap> = {
  ventas: {
    ...COMUNES,
    codigo: ["Código", "Código VE", "Codigo"],
    codigo_dev: ["Código DEV"],
    codigo_prenda: ["Código prenda"],
    codigo_ve_asociada: ["Código VE asociada"],
    origen_metal: ["Origen del metal"],
  },
  compras: {
    ...COMUNES,
    codigo: ["Código CO", "Código", "Codigo"],
  },
  recuperables: {
    ...COMUNES,
    codigo: ["Código VR", "Código", "Codigo"],
  },
  trabajos: {
    ...COMUNES,
    codigo: ["Código TR", "Código", "Codigo"],
    descripcion_trabajo: ["Descripción trabajo"],
  },
  reservas: {
    ...COMUNES,
    codigo: ["code", "Código"],
    codigo_ver: ["Código VER"],
    codigo_der: ["Código DER"],
    codigo_prenda: ["Codigo"],
    origen_metal: ["Origen del metal"],
    descuento_eur: ["Descuento por producto (€)"],
    cliente_id: ["Bookings - Código RS__customer_id"],
    cliente_nombre: ["Customers__main_name"],
    cliente_email: ["Customers__email"],
    cliente_telefono: ["Customers__mobile_phone"],
    cliente_genero: ["Customers__legal_gender"],
    cliente_ciudad: ["Customers__city"],
    cliente_provincia: ["Customers__province"],
    cliente_cp: ["Customers__postal_code"],
  },
};

const NUMERICOS = new Set(["peso_g", "pago_eur", "descuento_eur"]);
const FECHAS = new Set(["fecha_operacion"]);

const EXCEL_EPOCH_DIFF = 25569; // días entre 1899-12-30 y 1970-01-01

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj && obj[k] !== undefined) return obj[k];
  }
  return undefined;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  // Serial de Excel (JSON histórico exportado con SheetJS)
  if (typeof v === "number") {
    const ms = Math.round((v - EXCEL_EPOCH_DIFF) * 86400 * 1000);
    return new Date(ms).toISOString();
  }
  // ISO / fecha de Metabase
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Convierte una fila de origen en la fila canónica de la BD + row_hash. */
export function buildRow(
  table: OperacionKey,
  src: Record<string, unknown>,
  source: "metabase" | "historico"
): Record<string, unknown> {
  const map = MAPEOS[table];
  const out: Record<string, unknown> = {};

  for (const [field, candidates] of Object.entries(map)) {
    const raw = pick(src, candidates);
    if (FECHAS.has(field)) out[field] = toDate(raw);
    else if (NUMERICOS.has(field)) out[field] = toNumber(raw);
    else out[field] = raw === undefined || raw === "" ? null : String(raw).trim();
  }

  // Hash determinista de los campos significativos → idempotencia en upsert
  const hashBase = JSON.stringify([
    table,
    out.codigo,
    out.tipo_operacion,
    out.fecha_operacion,
    out.codigo_prenda ?? out.descripcion_prenda,
    out.pago_eur,
    out.peso_g,
    out.tienda,
  ]);
  out.row_hash = crypto.createHash("md5").update(hashBase).digest("hex");
  out.source = source;

  return out;
}

/** Clasifica el metal a partir del campo "quilate". */
export function clasificarMetal(quilate: string | null | undefined): "oro" | "plata" | "otro" {
  const q = (quilate || "").toLowerCase();
  if (q.includes("oro")) return "oro";
  if (q.includes("plata")) return "plata";
  return "otro";
}
