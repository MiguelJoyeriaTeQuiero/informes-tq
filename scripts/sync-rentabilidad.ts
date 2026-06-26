/**
 * Sincroniza la rentabilidad (card #26 "Productos Vendidos") a Supabase.
 *   npm run sync:rentabilidad
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
import { sincronizarRentabilidad } from "../lib/rentabilidad-sync";
(async () => {
  console.log("Sincronizando rentabilidad (productos vendidos)…");
  const t0 = Date.now();
  const res = await sincronizarRentabilidad("script", (p) =>
    process.stdout.write(`\r  ${p.etiqueta.padEnd(40)}`)
  );
  console.log(`\n${res.ok ? "✓" : "✗"} ${res.filas.toLocaleString()} líneas · ${res.paginas} páginas · ${Math.round((Date.now() - t0) / 1000)}s`);
  if (res.error) console.error("Error:", res.error);
  process.exit(res.ok ? 0 : 1);
})();
