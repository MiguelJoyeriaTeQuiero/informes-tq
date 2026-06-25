import pptxgen from "pptxgenjs";
import type { KpiRow, SerieRow, RankingRow } from "./queries";
import type { PreciosMetales } from "./metals";
import { OPERACIONES, type OperacionKey } from "./types";
import { fmtEur, fmtEur2, fmtGramos, fmtNum, MESES } from "./format";

const DARK = "00557F";
const BLUE = "0099F2";
const GOLD = "C8A164";
const SAND = "E8E3DF";
const GRIS = "64748B";

export interface DatosPpt {
  anio: number;
  mes: number;
  kpis: KpiRow[];
  kpisPrev: KpiRow[];
  serie: SerieRow[];
  rkTienda: RankingRow[];
  rkEmpleado: RankingRow[];
  metales: PreciosMetales;
}

function variacion(act: number, prev: number): string {
  if (!prev) return "—";
  const v = ((act - prev) / Math.abs(prev)) * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

export async function generarPptx(d: DatosPpt): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5"
  pptx.author = "Joyerías Te Quiero";
  pptx.company = "Joyerías Te Quiero";

  const byKey = (k: OperacionKey, arr: KpiRow[]) =>
    arr.find((r) => r.operacion === k);
  const nombreMes = `${MESES[d.mes]} ${d.anio}`;
  const ventas = byKey("ventas", d.kpis);

  // ---------- Portada ----------
  const s1 = pptx.addSlide();
  s1.background = { color: DARK };
  s1.addText("JOYERÍAS TE QUIERO", {
    x: 0.7, y: 2.4, w: 12, h: 0.5, color: BLUE, fontSize: 16, bold: true, charSpacing: 3,
  });
  s1.addText("Comité de Dirección", {
    x: 0.7, y: 3.0, w: 12, h: 1, color: "FFFFFF", fontSize: 40, bold: true,
  });
  s1.addText(`Informe de resultados · ${nombreMes}`, {
    x: 0.7, y: 4.0, w: 12, h: 0.6, color: "FFFFFF", fontSize: 20,
  });
  s1.addShape(pptx.ShapeType.line, {
    x: 0.75, y: 3.95, w: 3, h: 0, line: { color: GOLD, width: 2 },
  });
  s1.addText(`Generado el ${new Date().toLocaleDateString("es-ES")}`, {
    x: 0.7, y: 6.7, w: 12, h: 0.4, color: "FFFFFF", fontSize: 11, transparency: 40,
  });

  // ---------- Resumen ejecutivo ----------
  const s2 = pptx.addSlide();
  tituloSlide(pptx, s2, "Resumen ejecutivo", nombreMes);
  const oroT = d.kpis.reduce((a, r) => a + Number(r.gramos_oro), 0);
  const plataT = d.kpis.reduce((a, r) => a + Number(r.gramos_plata), 0);
  const opsT = d.kpis.reduce((a, r) => a + Number(r.unidades), 0);
  const tarjetas = [
    { t: "Facturación (Ventas)", v: fmtEur(Number(ventas?.euros ?? 0)),
      sub: `${variacion(Number(ventas?.euros ?? 0), Number(byKey("ventas", d.kpisPrev)?.euros ?? 0))} interanual` },
    { t: "Oro movido", v: fmtGramos(oroT), sub: "todas las operaciones" },
    { t: "Plata movida", v: fmtGramos(plataT), sub: "todas las operaciones" },
    { t: "Nº operaciones", v: fmtNum(opsT), sub: "líneas del periodo" },
  ];
  tarjetas.forEach((c, i) => {
    const x = 0.7 + i * 3.1;
    s2.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.6, w: 2.9, h: 1.9, fill: { color: i === 0 ? DARK : "F4F7FA" },
      line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1,
    });
    s2.addText(c.t, { x: x + 0.2, y: 1.75, w: 2.5, h: 0.4, fontSize: 11, color: i === 0 ? "FFFFFF" : GRIS });
    s2.addText(c.v, { x: x + 0.2, y: 2.2, w: 2.5, h: 0.6, fontSize: 24, bold: true, color: i === 0 ? "FFFFFF" : DARK });
    s2.addText(c.sub, { x: x + 0.2, y: 2.95, w: 2.5, h: 0.4, fontSize: 9, color: i === 0 ? BLUE : GRIS });
  });
  // Gráfico de tendencia
  const labels = d.serie.map((r) => {
    const dd = new Date(r.mes);
    return `${MESES[dd.getUTCMonth()].slice(0, 3)} ${String(dd.getUTCFullYear()).slice(2)}`;
  });
  s2.addText("Evolución últimos 12 meses (€)", { x: 0.7, y: 3.9, w: 8, h: 0.4, fontSize: 13, bold: true, color: DARK });
  s2.addChart(
    pptx.ChartType.line,
    [{ name: "Importe", labels, values: d.serie.map((r) => Number(r.euros)) }],
    { x: 0.7, y: 4.3, w: 11.9, h: 2.8, chartColors: [BLUE], lineSize: 3,
      showLegend: false, lineSmooth: true, valAxisLabelColor: GRIS, catAxisLabelColor: GRIS,
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9 }
  );

  // ---------- Una slide por operación ----------
  (Object.keys(OPERACIONES) as OperacionKey[]).forEach((key) => {
    const meta = OPERACIONES[key];
    const k = byKey(key, d.kpis);
    const kp = byKey(key, d.kpisPrev);
    const s = pptx.addSlide();
    tituloSlide(pptx, s, meta.label, nombreMes);
    const ticket = k && Number(k.unidades) ? Number(k.euros) / Number(k.unidades) : 0;
    const filas: [string, string][] = [
      ["Importe", fmtEur(Number(k?.euros ?? 0))],
      ["Variación interanual", variacion(Number(k?.euros ?? 0), Number(kp?.euros ?? 0))],
      ["Nº operaciones", fmtNum(Number(k?.unidades ?? 0))],
      ["Ticket medio", fmtEur2(ticket)],
      ["Oro", fmtGramos(Number(k?.gramos_oro ?? 0))],
      ["Plata", fmtGramos(Number(k?.gramos_plata ?? 0))],
    ];
    filas.forEach((f, i) => {
      const y = 1.7 + i * 0.78;
      s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y, w: 5.2, h: 0.66, fill: { color: i % 2 ? "F4F7FA" : "FFFFFF" }, line: { color: "E2E8F0", width: 0.5 }, rectRadius: 0.06 });
      s.addText(f[0], { x: 0.9, y, w: 3.2, h: 0.66, fontSize: 13, color: GRIS, valign: "middle" });
      s.addText(f[1], { x: 3.9, y, w: 1.8, h: 0.66, fontSize: 14, bold: true, color: DARK, align: "right", valign: "middle" });
    });
    // tendencia de la operación (reaprovechamos serie global como contexto visual)
    s.addText("Contexto: evolución global (€)", { x: 6.4, y: 1.6, w: 6, h: 0.4, fontSize: 12, bold: true, color: DARK });
    s.addChart(
      pptx.ChartType.area,
      [{ name: meta.label, labels, values: d.serie.map((r) => Number(r.euros)) }],
      { x: 6.4, y: 2.0, w: 6.2, h: 4.5, chartColors: [BLUE], showLegend: false,
        catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, catAxisLabelColor: GRIS, valAxisLabelColor: GRIS }
    );
  });

  // ---------- Rankings ----------
  const s3 = pptx.addSlide();
  tituloSlide(pptx, s3, "Rankings · Ventas", nombreMes);
  s3.addText("Top tiendas (€)", { x: 0.7, y: 1.6, w: 5, h: 0.4, fontSize: 13, bold: true, color: DARK });
  s3.addChart(
    pptx.ChartType.bar,
    [{ name: "Ventas", labels: d.rkTienda.map((r) => r.etiqueta), values: d.rkTienda.map((r) => Number(r.euros)) }],
    { x: 0.7, y: 2.0, w: 5.8, h: 4.8, barDir: "bar", chartColors: [DARK], showLegend: false,
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, catAxisLabelColor: GRIS, valAxisLabelColor: GRIS }
  );
  s3.addText("Top empleados (€)", { x: 6.9, y: 1.6, w: 5, h: 0.4, fontSize: 13, bold: true, color: DARK });
  s3.addChart(
    pptx.ChartType.bar,
    [{ name: "Ventas", labels: d.rkEmpleado.map((r) => r.etiqueta), values: d.rkEmpleado.map((r) => Number(r.euros)) }],
    { x: 6.9, y: 2.0, w: 5.8, h: 4.8, barDir: "bar", chartColors: [BLUE], showLegend: false,
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, catAxisLabelColor: GRIS, valAxisLabelColor: GRIS }
  );

  // ---------- Metales (contexto) ----------
  const s4 = pptx.addSlide();
  tituloSlide(pptx, s4, "Contexto de mercado · Metales", nombreMes);
  const metales = [
    { t: "Oro", g: fmtEur2(d.metales.oro.eurGramo), o: fmtEur2(d.metales.oro.eurOnza), c: GOLD },
    { t: "Plata", g: fmtEur2(d.metales.plata.eurGramo), o: fmtEur2(d.metales.plata.eurOnza), c: "9AA6B2" },
  ];
  metales.forEach((mt, i) => {
    const x = 0.7 + i * 6.2;
    s4.addShape(pptx.ShapeType.roundRect, { x, y: 2.0, w: 5.9, h: 3.2, fill: { color: "F4F7FA" }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.12 });
    s4.addShape(pptx.ShapeType.rect, { x, y: 2.0, w: 0.12, h: 3.2, fill: { color: mt.c } });
    s4.addText(mt.t, { x: x + 0.4, y: 2.3, w: 5, h: 0.6, fontSize: 22, bold: true, color: DARK });
    s4.addText(`${mt.g}  / gramo`, { x: x + 0.4, y: 3.2, w: 5, h: 0.6, fontSize: 28, bold: true, color: mt.c });
    s4.addText(`${mt.o}  / onza troy`, { x: x + 0.4, y: 4.1, w: 5, h: 0.5, fontSize: 14, color: GRIS });
  });
  s4.addText(`Fuente: ${d.metales.fuente} · Precio orientativo a fecha de generación`, {
    x: 0.7, y: 6.6, w: 12, h: 0.4, fontSize: 10, color: GRIS, italic: true,
  });

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}

function tituloSlide(
  pptx: any,
  slide: any,
  titulo: string,
  sub: string
) {
  slide.background = { color: "FFFFFF" };
  slide.addText(titulo, { x: 0.7, y: 0.5, w: 9, h: 0.7, fontSize: 26, bold: true, color: DARK });
  slide.addText(sub, { x: 0.7, y: 1.1, w: 9, h: 0.4, fontSize: 13, color: GRIS });
  slide.addShape(pptx.ShapeType.line, { x: 0.72, y: 1.5, w: 1.6, h: 0, line: { color: GOLD, width: 2 } });
  slide.addText("Te Quiero", { x: 11.2, y: 0.55, w: 1.5, h: 0.4, fontSize: 12, bold: true, color: BLUE, align: "right" });
}
