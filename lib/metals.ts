// Precio actual de oro y plata en EUR. Fuente gratuita sin clave (gold-api.com)
// + conversión USD→EUR (frankfurter.app). Con fallback si algo falla.

const OZ_TO_G = 31.1034768;

export interface PrecioMetal {
  metal: "Oro" | "Plata";
  eurOnza: number;
  eurGramo: number;
}

export interface PreciosMetales {
  oro: PrecioMetal;
  plata: PrecioMetal;
  actualizado: string;
  fuente: string;
}

async function precioUsdOnza(symbol: "XAU" | "XAG"): Promise<number | null> {
  try {
    const r = await fetch(`https://api.gold-api.com/price/${symbol}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { price?: number };
    return typeof j.price === "number" ? j.price : null;
  } catch {
    return null;
  }
}

async function tasaUsdEur(): Promise<number> {
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR", {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      const j = (await r.json()) as { rates?: { EUR?: number } };
      if (j.rates?.EUR) return j.rates.EUR;
    }
  } catch {
    /* ignore */
  }
  return 0.92; // fallback aproximado
}

export async function getPreciosMetales(): Promise<PreciosMetales> {
  const [oroUsd, plataUsd, tasa] = await Promise.all([
    precioUsdOnza("XAU"),
    precioUsdOnza("XAG"),
    tasaUsdEur(),
  ]);

  const oroOzEur = (oroUsd ?? 2400) * tasa;
  const plataOzEur = (plataUsd ?? 28) * tasa;

  return {
    oro: { metal: "Oro", eurOnza: oroOzEur, eurGramo: oroOzEur / OZ_TO_G },
    plata: { metal: "Plata", eurOnza: plataOzEur, eurGramo: plataOzEur / OZ_TO_G },
    actualizado: new Date().toISOString(),
    fuente: "gold-api.com · frankfurter.app",
  };
}
