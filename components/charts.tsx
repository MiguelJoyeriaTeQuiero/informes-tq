"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtEur, fmtNum } from "@/lib/format";

const AZUL = "#0099F2";
const OSCURO = "#00557F";
const ORO = "#C8A164";
const PALETA = ["#00557F", "#0099F2", "#C8A164", "#6fb2d8", "#9aa6b2", "#2f8dc2", "#d4a373"];

function CajaTooltip({
  active,
  payload,
  label,
  fmt,
}: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-xs shadow-card">
      <p className="mb-1 font-medium text-slate-700">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {fmt ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export function AreaTendencia({
  data,
  dataKey = "euros",
  formato = "euro",
}: {
  data: { label: string; euros: number; gramos: number; unidades: number }[];
  dataKey?: "euros" | "gramos" | "unidades";
  formato?: "euro" | "num";
}) {
  const fmt = formato === "euro" ? fmtEur : fmtNum;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AZUL} stopOpacity={0.35} />
            <stop offset="100%" stopColor={AZUL} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={60}
          domain={[(min: number) => min - Math.abs(min) * 0.12, (max: number) => max + Math.abs(max) * 0.12]}
          tickFormatter={(v) => (formato === "euro" ? `${Math.round(v / 1000)}k` : fmtNum(v))} />
        <Tooltip content={<CajaTooltip fmt={fmt} />} />
        <Area type="monotone" dataKey={dataKey} stroke={OSCURO} strokeWidth={2.5} fill="url(#g)" baseValue="dataMin" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarrasRanking({
  data,
  formato = "euro",
}: {
  data: { etiqueta: string; euros: number; gramos: number; unidades: number }[];
  formato?: "euro" | "num";
}) {
  const fmt = formato === "euro" ? fmtEur : fmtNum;
  const key = formato === "euro" ? "euros" : "gramos";
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
          tickFormatter={(v) => (formato === "euro" ? `${Math.round(v / 1000)}k` : fmtNum(v))} />
        <YAxis type="category" dataKey="etiqueta" width={130} tick={{ fontSize: 11, fill: "#475569" }}
          tickLine={false} axisLine={false} />
        <Tooltip content={<CajaTooltip fmt={fmt} />} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey={key} radius={[0, 6, 6, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETA[i % PALETA.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutDistribucion({
  data,
  formato = "euro",
}: {
  data: { nombre: string; valor: number }[];
  formato?: "euro" | "num";
}) {
  const fmt = formato === "euro" ? fmtEur : fmtNum;
  const limpio = data.filter((d) => d.valor > 0);
  if (!limpio.length)
    return <p className="py-12 text-center text-sm text-slate-400">Sin datos</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={limpio}
          dataKey="valor"
          nameKey="nombre"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          stroke="none"
        >
          {limpio.map((_, i) => (
            <Cell key={i} fill={PALETA[i % PALETA.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: any, n: any) => [fmt(Number(v)), n]}
          contentStyle={{ borderRadius: 10, border: "1px solid #eef2f6", fontSize: 12 }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12, color: "#64748b" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BarrasSemana({
  data,
  formato = "euro",
}: {
  data: { dia: string; euros: number; unidades: number }[];
  formato?: "euro" | "num";
}) {
  const fmt = formato === "euro" ? fmtEur : fmtNum;
  const key = formato === "euro" ? "euros" : "unidades";
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={56}
          tickFormatter={(v) => (formato === "euro" ? `${Math.round(v / 1000)}k` : fmtNum(v))} />
        <Tooltip content={<CajaTooltip fmt={fmt} />} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey={key} radius={[6, 6, 0, 0]} fill={AZUL} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineComparativa({
  data,
  series,
  formato = "euro",
}: {
  data: Record<string, any>[];
  series: { key: string; color: string }[];
  formato?: "euro" | "num";
}) {
  const fmt = formato === "euro" ? fmtEur : fmtNum;
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={64}
          tickFormatter={(v) => (formato === "euro" ? `${Math.round(v / 1000)}k` : fmtNum(v))} />
        <Tooltip content={<CajaTooltip fmt={fmt} />} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export { ORO, AZUL, OSCURO, PALETA };
