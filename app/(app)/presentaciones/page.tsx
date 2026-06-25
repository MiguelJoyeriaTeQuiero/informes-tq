"use client";

import { useState } from "react";
import { MESES } from "@/lib/format";
import { Download, Loader2, Presentation, Check } from "lucide-react";

export default function PresentacionesPage() {
  const ahora = new Date();
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth());
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anios = Array.from({ length: 6 }, (_, i) => ahora.getFullYear() - i);

  async function descargar() {
    setLoading(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch(`/api/ppt?anio=${anio}&mes=${mes}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error generando la presentación");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Comite_TeQuiero_${MESES[mes]}_${anio}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
      setOk(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="panel overflow-hidden">
        <div className="bg-brand-dark p-8 text-white">
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <Presentation className="h-6 w-6" />
          </span>
          <h2 className="font-display text-2xl">Presentación para el Comité de Dirección</h2>
          <p className="mt-1 max-w-lg text-white/70">
            Genera un PowerPoint premium con el resumen ejecutivo, una sección por
            operación, rankings de tiendas y empleados, y el contexto de metales del mes
            seleccionado.
          </p>
        </div>

        <div className="space-y-5 p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Mes</label>
              <select className="input" value={mes} onChange={(e) => setMes(+e.target.value)}>
                {MESES.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Año</label>
              <select className="input" value={anio} onChange={(e) => setAnio(+e.target.value)}>
                {anios.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button onClick={descargar} disabled={loading} className="btn-primary w-full">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generando presentación…</>
            ) : ok ? (
              <><Check className="h-4 w-4" /> Descargada · generar de nuevo</>
            ) : (
              <><Download className="h-4 w-4" /> Generar y descargar PowerPoint</>
            )}
          </button>
          <p className="text-center text-xs text-slate-400">
            El archivo se descarga en formato .pptx editable (gráficos nativos de PowerPoint).
          </p>
        </div>
      </div>
    </div>
  );
}
