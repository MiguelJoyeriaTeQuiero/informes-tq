import { Database } from "lucide-react";
import Link from "next/link";

export function EmptyState({
  titulo = "Sin datos todavía",
  mensaje = "Aún no hay operaciones cargadas. Ejecuta la migración del histórico o una sincronización con Metabase.",
  mostrarConfig = true,
}: {
  titulo?: string;
  mensaje?: string;
  mostrarConfig?: boolean;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 p-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-sand text-brand-dark">
        <Database className="h-6 w-6" />
      </span>
      <h3 className="font-display text-lg text-slate-800">{titulo}</h3>
      <p className="max-w-md text-sm text-slate-500">{mensaje}</p>
      {mostrarConfig && (
        <Link href="/configuracion" className="btn-primary mt-2">
          Ir a Configuración
        </Link>
      )}
    </div>
  );
}
