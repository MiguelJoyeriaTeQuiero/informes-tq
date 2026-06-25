/**
 * Carga / refresca el inventario (Sellable Products) en Supabase.
 * Pensado para la carga INICIAL en local (sin límite de tiempo de serverless).
 *
 *   npm run sync:stock
 */
import fs from "node:fs";
import path from "node:path";

function cargarEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const linea of fs.readFileSync(p, "utf-8").split("\n")) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
cargarEnv();

import { sincronizarStock } from "../lib/stock-sync";

(async () => {
  console.log("Sincronizando inventario desde Metabase (paginado)…");
  const t0 = Date.now();
  const res = await sincronizarStock("script");
  console.log(
    `\n${res.ok ? "✓" : "✗"} ${res.piezas.toLocaleString()} piezas · ${res.paginas} páginas · ` +
      `snapshot ${res.snapshot} filas · ${Math.round((Date.now() - t0) / 1000)}s`
  );
  if (res.error) console.error("Error:", res.error);
  process.exit(res.ok ? 0 : 1);
})();
