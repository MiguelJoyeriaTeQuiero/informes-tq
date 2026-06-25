// Formateadores en español (España) / euros

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eur2 = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const num0 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat("es-ES", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const fmtEur = (n: number | null | undefined) => eur.format(Number(n ?? 0));
export const fmtEur2 = (n: number | null | undefined) => eur2.format(Number(n ?? 0));
export const fmtNum = (n: number | null | undefined) => num0.format(Number(n ?? 0));
export const fmtGramos = (n: number | null | undefined) =>
  `${num1.format(Number(n ?? 0))} g`;
export const fmtPct = (n: number | null | undefined) => pct.format(Number(n ?? 0));

export function fmtVariacion(actual: number, anterior: number): {
  texto: string;
  positivo: boolean;
  valor: number;
} {
  if (!anterior) return { texto: "—", positivo: actual >= 0, valor: 0 };
  const v = (actual - anterior) / Math.abs(anterior);
  return {
    texto: `${v >= 0 ? "+" : ""}${pct.format(v)}`,
    positivo: v >= 0,
    valor: v,
  };
}

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
