/**
 * Cliente de Metabase — usa la API key de un usuario de servicio.
 * El endpoint /api/card/{id}/query/json devuelve el resultado completo del card
 * como array de objetos { "Nombre Columna": valor }.
 */
export async function fetchCardData(
  cardId: number
): Promise<Record<string, unknown>[]> {
  const base = process.env.METABASE_URL!;
  const key = process.env.METABASE_API_KEY!;

  // format_rows=false → valores crudos (fechas ISO, números sin formato),
  // pero SÍ devuelve todas las filas (a diferencia de /query, limitado a 2000).
  const res = await fetch(`${base}/api/card/${cardId}/query/json?format_rows=false`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Metabase card #${cardId} devolvió ${res.status}: ${text.slice(0, 300)}`
    );
  }
  const data = (await res.json()) as Record<string, unknown>[];
  if (!Array.isArray(data)) {
    throw new Error(`Metabase card #${cardId}: respuesta inesperada`);
  }
  return data;
}
