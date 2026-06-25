"use client";

import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { fmtEur2, fmtGramos } from "@/lib/format";

export interface Movimiento {
  fecha_operacion: string | null;
  codigo: string | null;
  tipo_operacion: string | null;
  descripcion_prenda: string | null;
  familia_prenda: string | null;
  quilate_prenda: string | null;
  metodo_pago: string | null;
  tienda: string | null;
  empleado: string | null;
  peso_g: number | null;
  pago_eur: number | null;
}

const PAGINA = 200;

function unicos(rows: Movimiento[], campo: keyof Movimiento): string[] {
  return [...new Set(rows.map((r) => (r[campo] as string) || "").filter(Boolean))].sort();
}

export function MovimientosTable({
  rows,
  total,
}: {
  rows: Movimiento[];
  total: number;
}) {
  const [q, setQ] = useState("");
  const [fTienda, setFTienda] = useState("");
  const [fEmpleado, setFEmpleado] = useState("");
  const [fMetodo, setFMetodo] = useState("");
  const [fTipo, setFTipo] = useState("");
  const [limite, setLimite] = useState(PAGINA);

  const tiendas = useMemo(() => unicos(rows, "tienda"), [rows]);
  const empleados = useMemo(() => unicos(rows, "empleado"), [rows]);
  const metodos = useMemo(() => unicos(rows, "metodo_pago"), [rows]);
  const tipos = useMemo(() => unicos(rows, "tipo_operacion"), [rows]);

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (fTienda && r.tienda !== fTienda) return false;
      if (fEmpleado && r.empleado !== fEmpleado) return false;
      if (fMetodo && r.metodo_pago !== fMetodo) return false;
      if (fTipo && r.tipo_operacion !== fTipo) return false;
      if (term) {
        const blob = `${r.codigo ?? ""} ${r.descripcion_prenda ?? ""} ${r.familia_prenda ?? ""} ${r.empleado ?? ""} ${r.tienda ?? ""}`.toLowerCase();
        if (!blob.includes(term)) return false;
      }
      return true;
    });
  }, [rows, q, fTienda, fEmpleado, fMetodo, fTipo]);

  const sumImporte = filtradas.reduce((s, r) => s + Number(r.pago_eur ?? 0), 0);

  function exportarCSV() {
    const cab = ["Fecha", "Código", "Tipo", "Descripción", "Familia", "Quilate", "Método pago", "Tienda", "Empleado", "Peso (g)", "Importe (€)"];
    const filas = filtradas.map((r) => [
      r.fecha_operacion ? new Date(r.fecha_operacion).toLocaleString("es-ES") : "",
      r.codigo ?? "", r.tipo_operacion ?? "", r.descripcion_prenda ?? "", r.familia_prenda ?? "",
      r.quilate_prenda ?? "", r.metodo_pago ?? "", r.tienda ?? "", r.empleado ?? "",
      String(r.peso_g ?? ""), String(r.pago_eur ?? ""),
    ]);
    const csv = [cab, ...filas]
      .map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "movimientos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectCls =
    "rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-600 outline-none focus:border-brand-blue";

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <h2 className="font-display text-lg text-slate-800">Movimientos detallados</h2>
          <p className="text-xs text-slate-400">
            {filtradas.length.toLocaleString("es-ES")} de {rows.length.toLocaleString("es-ES")} cargados
            {rows.length < total && ` · ${total.toLocaleString("es-ES")} en el periodo`} · suma {fmtEur2(sumImporte)}
          </p>
        </div>
        <button onClick={exportarCSV} className="btn-ghost border border-slate-200">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar código, descripción, empleado…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-blue"
          />
        </div>
        <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} className={selectCls}>
          <option value="">Todos los tipos</option>
          {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fTienda} onChange={(e) => setFTienda(e.target.value)} className={selectCls}>
          <option value="">Todas las tiendas</option>
          {tiendas.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fEmpleado} onChange={(e) => setFEmpleado(e.target.value)} className={selectCls}>
          <option value="">Todos los empleados</option>
          {empleados.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={fMetodo} onChange={(e) => setFMetodo(e.target.value)} className={selectCls}>
          <option value="">Todos los métodos</option>
          {metodos.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="max-h-[640px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Familia</th>
              <th className="px-4 py-3 font-medium">Quilate</th>
              <th className="px-4 py-3 font-medium">Método</th>
              <th className="px-4 py-3 font-medium">Tienda</th>
              <th className="px-4 py-3 font-medium">Empleado</th>
              <th className="px-4 py-3 text-right font-medium">Peso</th>
              <th className="px-4 py-3 text-right font-medium">Importe</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.slice(0, limite).map((r, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                  {r.fecha_operacion ? new Date(r.fecha_operacion).toLocaleDateString("es-ES") : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-700">{r.codigo}</td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-500">{r.tipo_operacion}</td>
                <td className="max-w-[220px] truncate px-4 py-2 text-slate-600">{r.descripcion_prenda}</td>
                <td className="px-4 py-2 text-slate-500">{r.familia_prenda}</td>
                <td className="px-4 py-2 text-slate-500">{r.quilate_prenda}</td>
                <td className="px-4 py-2 text-slate-500">{r.metodo_pago}</td>
                <td className="px-4 py-2 text-slate-500">{r.tienda}</td>
                <td className="px-4 py-2 text-slate-500">{r.empleado}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right text-slate-500">{fmtGramos(r.peso_g)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-slate-700">{fmtEur2(r.pago_eur)}</td>
              </tr>
            ))}
            {!filtradas.length && (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-400">Sin resultados con esos filtros</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {filtradas.length > limite && (
        <div className="border-t border-slate-100 p-3 text-center">
          <button onClick={() => setLimite((l) => l + PAGINA)} className="btn-ghost">
            Mostrar más ({(filtradas.length - limite).toLocaleString("es-ES")} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
