"use client";

import { TrendingUp, DollarSign, BedDouble, Calendar } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { StatCard } from "@/components/dashboard/stat-card";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const formatCLP = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

// Datos de ejemplo para febrero 2026
const dailyIncome: { fecha: string; ingresos: number }[] = [];
const dailyOccupancy: { fecha: string; ocupacion: number }[] = [];
for (let d = 1; d <= 28; d++) {
  const date = `2026-02-${String(d).padStart(2, "0")}`;
  dailyIncome.push({
    fecha: format(new Date(date), "d MMM", { locale: es }),
    ingresos: 80000 + Math.round(Math.random() * 120000),
  });
  dailyOccupancy.push({
    fecha: format(new Date(date), "d MMM", { locale: es }),
    ocupacion: 50 + Math.round(Math.random() * 45),
  });
}

const paymentBreakdown = [
  { name: "Efectivo", value: 420000, color: "var(--success)" },
  { name: "Transferencia", value: 580000, color: "var(--secondary)" },
  { name: "Débito", value: 180000, color: "#8b5cf6" },
  { name: "Crédito", value: 220000, color: "#7c3aed" },
];

const topRooms = [
  { habitacion: "Hab. 102", reservas: 18 },
  { habitacion: "Hab. 201", reservas: 16 },
  { habitacion: "Hab. 103", reservas: 14 },
  { habitacion: "Hab. 301", reservas: 12 },
  { habitacion: "Hab. 202", reservas: 10 },
];

/** Etiqueta del donut: color del segmento y separación correcta de la línea (desplazamiento radial) */
function renderPieLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
  fill?: string;
  payload?: { name?: string; color?: string; fill?: string };
}) {
  const cx = props.cx ?? 0;
  const cy = props.cy ?? 0;
  const midAngle = props.midAngle ?? 0;
  const outerRadius = props.outerRadius ?? 70;
  const percent = props.percent ?? 0;
  const name = props.name ?? props.payload?.name ?? "";
  const segmentColor = props.fill ?? props.payload?.color ?? props.payload?.fill ?? "var(--foreground)";
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 20;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  const gap = 9;
  const dist = r > 0 ? r : 1;
  const dx = (gap * (x - cx)) / dist;
  const dy = (gap * (y - cy)) / dist;
  const textAnchor = x >= cx ? "start" : "end";
  return (
    <g transform={`translate(${x}, ${y})`}>
      <text
        dx={dx}
        dy={dy}
        textAnchor={textAnchor}
        fill={segmentColor}
        className="text-xs font-medium"
      >
        {name} {(percent * 100).toFixed(0)}%
      </text>
    </g>
  );
}

export function AdminReportsView() {
  const monthLabel = "Febrero 2026";
  const ocupacionPromedio = 72;
  const ingresoTotal = 2_450_000;
  const ticketPromedio = 42_500;
  const comparacionMesAnterior = 8; // +8% vs enero

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Reportes
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Resumen del mes para que veas cómo va el negocio: ocupación, ingresos
          y qué habitaciones se reservan más. Compara con el mes anterior para
          tomar decisiones.
        </p>
      </div>

      {/* Selector de mes */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
        <p className="text-sm font-medium text-[var(--foreground)]">
          Período: <span className="text-[var(--primary)]">{monthLabel}</span>
        </p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          (En una versión futura podrás elegir el mes a consultar)
        </p>
      </div>

      {/* Métricas del mes */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
          Resumen del mes
        </h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Ocupación promedio"
            value={`${ocupacionPromedio}%`}
            icon={BedDouble}
            description="Habitaciones ocupadas en promedio"
            trend={{ value: comparacionMesAnterior, isPositive: true }}
          />
          <StatCard
            title="Ingreso total"
            value={formatCLP(ingresoTotal)}
            icon={DollarSign}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Ticket promedio por noche"
            value={formatCLP(ticketPromedio)}
            icon={TrendingUp}
            description="Ingreso por noche vendida"
            trend={{ value: 3, isPositive: true }}
          />
          <StatCard
            title="Días con datos"
            value="28"
            icon={Calendar}
            description="Días del mes con actividad"
          />
        </div>
      </div>

      {/* Gráfico: Ingresos diarios */}
      <div className="reports-chart rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-6 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-[var(--foreground)]">
          Ingresos diarios del mes
        </h3>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Cuánto entró cada día para ver picos y bajas.
        </p>
        <div className="h-60 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              id="incomeChart"
              syncId="income"
              data={dailyIncome}
              margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                stroke="var(--border)"
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                stroke="var(--border)"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v / 1000}k`}
                width={40}
              />
              <Tooltip
                formatter={(value: number | undefined) => [value != null ? formatCLP(value) : "", "Ingresos"]}
                labelFormatter={(label) => `Día: ${label}`}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  backgroundColor: "var(--background)",
                  fontSize: "12px"
                }}
              />
              <Line
                type="monotone"
                dataKey="ingresos"
                name="Ingresos"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico: Ocupación diaria */}
      <div className="reports-chart rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-6 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-[var(--foreground)]">
          Ocupación diaria (%)
        </h3>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Porcentaje de habitaciones ocupadas cada día.
        </p>
        <div className="h-60 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              id="occupancyChart"
              syncId="occupancy"
              data={dailyOccupancy}
              margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorOcupacion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                stroke="var(--border)"
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                stroke="var(--border)"
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                unit="%"
                width={30}
              />
              <Tooltip
                formatter={(value: number | undefined) => [value != null ? `${value}%` : "", "Ocupación"]}
                labelFormatter={(label) => `Día: ${label}`}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  backgroundColor: "var(--background)",
                  fontSize: "12px"
                }}
              />
              <Area
                type="monotone"
                dataKey="ocupacion"
                name="Ocupación"
                stroke="var(--secondary)"
                strokeWidth={2}
                fill="url(#colorOcupacion)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Desglose por método de pago */}
        <div className="reports-chart rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-6 shadow-sm">
          <h3 className="mb-2 text-base font-semibold text-[var(--foreground)]">
            Ingresos por método de pago
          </h3>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Cómo te pagan: efectivo, transferencia, tarjeta, etc.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive={false}
                  label={renderPieLabel}
                >
                  {paymentBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number | undefined) => (v != null ? formatCLP(v) : "")}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    backgroundColor: "var(--background)",
                    fontSize: "12px"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top habitaciones */}
        <div className="reports-chart rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-6 shadow-sm">
          <h3 className="mb-2 text-base font-semibold text-[var(--foreground)]">
            Habitaciones más reservadas
          </h3>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Las que más se venden este mes.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topRooms}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                  stroke="var(--border)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="habitacion"
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
                  stroke="var(--border)"
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip
                  formatter={(value: number | undefined) => [value != null ? `${value} reservas` : "", "Reservas"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    backgroundColor: "var(--background)",
                    fontSize: "12px"
                  }}
                  cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
                />
                <Bar dataKey="reservas" name="Reservas" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
