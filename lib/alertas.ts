import { unstable_cache } from "next/cache";
import { createAdminClient } from "./supabase/admin";
import { MESES } from "./format";

export interface Alerta {
  nivel: "rojo" | "ambar" | "info";
  titulo: string;
  detalle: string;
  href: string;
}

async function calcular(): Promise<Alerta[]> {
  const sb = createAdminClient();
  const alertas: Alerta[] = [];

  const { data: rango } = await sb.rpc("rango_fechas");
  const max = (rango ?? [])[0]?.max_fecha;
  if (!max) return alertas;
  const ref = new Date(max);
  const anio = ref.getUTCFullYear(), mes = ref.getUTCMonth();
  const hasta = new Date(Date.UTC(anio, mes + 1, 1)).toISOString();
  const desde4 = new Date(Date.UTC(anio, mes - 3, 1)).toISOString();
  const nombreMes = `${MESES[mes]} ${anio}`;

  // 1. Caída de ventas (mes vs media de los 3 anteriores)
  try {
    const { data } = await sb.rpc("serie_mensual", { p_operacion: "ventas", desde: desde4, hasta, p_tienda: null });
    const serie = (data ?? []) as { euros: number }[];
    if (serie.length >= 4) {
      const actual = Number(serie[serie.length - 1].euros);
      const media = serie.slice(0, -1).reduce((s, r) => s + Number(r.euros), 0) / (serie.length - 1);
      if (media > 0 && actual < media * 0.85) {
        const caida = ((media - actual) / media) * 100;
        alertas.push({
          nivel: actual < media * 0.7 ? "rojo" : "ambar",
          titulo: "Caída de ventas",
          detalle: `Las ventas de ${nombreMes} están un ${caida.toFixed(0)}% por debajo de la media de los 3 meses anteriores.`,
          href: "/ventas",
        });
      }
    }
  } catch { /* ignore */ }

  // 2. Caída de margen (rentabilidad mes vs media 3m)
  try {
    const { data } = await sb.rpc("rent_serie", { desde: desde4, hasta });
    const serie = (data ?? []) as { margen: number }[];
    if (serie.length >= 4) {
      const actual = Number(serie[serie.length - 1].margen);
      const media = serie.slice(0, -1).reduce((s, r) => s + Number(r.margen), 0) / (serie.length - 1);
      if (media > 0 && actual < media * 0.85) {
        alertas.push({
          nivel: actual < media * 0.7 ? "rojo" : "ambar",
          titulo: "Margen a la baja",
          detalle: `El margen bruto de ${nombreMes} cae un ${(((media - actual) / media) * 100).toFixed(0)}% respecto a la media reciente.`,
          href: "/finanzas",
        });
      }
    }
  } catch { /* ignore */ }

  // 3. Stock muerto (>12 meses) disponible
  try {
    const { data } = await sb.rpc("stock_aging", { p_estados: ["DIS"] });
    const viejo = (data ?? []).filter((a: any) => a.orden >= 4).reduce((s: number, a: any) => s + Number(a.valor_coste), 0);
    const piezas = (data ?? []).filter((a: any) => a.orden >= 4).reduce((s: number, a: any) => s + Number(a.piezas), 0);
    if (viejo > 0) {
      alertas.push({
        nivel: "ambar",
        titulo: "Stock inmovilizado (+12 meses)",
        detalle: `${piezas.toLocaleString("es-ES")} piezas disponibles llevan más de 12 meses sin venderse (${Math.round(viejo).toLocaleString("es-ES")} € a coste).`,
        href: "/inventario",
      });
    }
  } catch { /* ignore */ }

  // 4. Pico de devoluciones en ventas
  try {
    const desdeMes = new Date(Date.UTC(anio, mes, 1)).toISOString();
    const { data } = await sb.rpc("desglose", { p_operacion: "ventas", p_dim: "tipo_operacion", desde: desdeMes, hasta, p_tienda: null });
    const filas = (data ?? []) as { etiqueta: string; euros: number }[];
    const total = filas.reduce((s, f) => s + Math.abs(Number(f.euros)), 0) || 1;
    const dev = filas.filter((f) => /devoluci/i.test(f.etiqueta)).reduce((s, f) => s + Math.abs(Number(f.euros)), 0);
    const tasa = dev / total;
    if (tasa > 0.12) {
      alertas.push({
        nivel: tasa > 0.2 ? "rojo" : "ambar",
        titulo: "Pico de devoluciones",
        detalle: `La tasa de devolución de ventas en ${nombreMes} es del ${(tasa * 100).toFixed(1)}%.`,
        href: "/ventas",
      });
    }
  } catch { /* ignore */ }

  return alertas;
}

export const getAlertas = unstable_cache(calcular, ["alertas-v1"], { revalidate: 600 });
