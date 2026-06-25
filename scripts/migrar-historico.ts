/**
 * Migra el histórico de la app vieja (JSON gzip+base64, texto windows-1252)
 * a las tablas de Supabase. Idempotente gracias a row_hash.
 *
 *   npm run migrate:historico
 *
 * Requiere las variables de .env.local (se cargan automáticamente abajo).
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { buildRow } from "../lib/transform";
import { createAdminClient } from "../lib/supabase/admin";
import { OPERACION_LIST, type OperacionKey } from "../lib/types";

// --- cargar .env.local manualmente ---
function cargarEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const linea of fs.readFileSync(p, "utf-8").split("\n")) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
cargarEnv();

const JSON_PATH = path.resolve(process.cwd(), "..", "app vieja", "jtq_datos (11).json");
const BATCH = 1000;

async function main() {
  console.log("Leyendo", JSON_PATH);
  const outer = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8")) as { b64: string };
  const raw = zlib.gunzipSync(Buffer.from(outer.b64, "base64"));
  // El texto interno está en UTF-8
  const obj = JSON.parse(raw.toString("utf-8")) as {
    db: Record<string, Record<string, unknown>[]>;
  };
  const db = obj.db;

  const admin = createAdminClient();
  let totalGlobal = 0;

  for (const op of OPERACION_LIST) {
    const filas = db[op.jsonKey];
    if (!Array.isArray(filas)) {
      console.log(`! ${op.label}: sin datos en JSON (clave ${op.jsonKey})`);
      continue;
    }
    console.log(`\n${op.label} (${op.jsonKey}): ${filas.length.toLocaleString()} filas`);

    // Dedupe por row_hash dentro del propio lote para evitar conflictos en upsert
    const vistos = new Set<string>();
    const canon: Record<string, unknown>[] = [];
    for (const f of filas) {
      const row = buildRow(op.key as OperacionKey, f, "historico");
      const h = row.row_hash as string;
      if (vistos.has(h)) continue;
      vistos.add(h);
      canon.push(row);
    }

    let escritas = 0;
    for (let i = 0; i < canon.length; i += BATCH) {
      const chunk = canon.slice(i, i + BATCH);
      const { error } = await admin
        .from(op.key)
        .upsert(chunk, { onConflict: "row_hash", ignoreDuplicates: true });
      if (error) {
        console.error(`  ✗ lote ${i}: ${error.message}`);
      } else {
        escritas += chunk.length;
        process.stdout.write(`\r  ${escritas.toLocaleString()}/${canon.length.toLocaleString()}`);
      }
    }
    totalGlobal += escritas;
    console.log(`\n  ✓ ${escritas.toLocaleString()} filas únicas cargadas`);
  }

  console.log(`\n=== Migración completada: ${totalGlobal.toLocaleString()} filas ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
