/**
 * Sincroniza los 11 informes del Departamento de Compras a Supabase.
 *   npm run sync:compras
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

import { sincronizarCompras } from "../lib/compras-sync";

(async () => {
  console.log("Sincronizando informes de Compras…");
  const t0 = Date.now();
  const res = await sincronizarCompras("script", (p) =>
    process.stdout.write(`\r  ${p.etiqueta.padEnd(45)} (${p.actual}/${p.total})`)
  );
  console.log(`\n${res.ok ? "✓" : "✗"} ${res.total.toLocaleString()} filas · ${Math.round((Date.now() - t0) / 1000)}s`);
  for (const [k, v] of Object.entries(res.porReporte)) if (v.error) console.error(`  ✗ ${k}: ${v.error}`);
  process.exit(res.ok ? 0 : 1);
})();
