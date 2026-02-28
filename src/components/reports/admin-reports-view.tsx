"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import { DollarSign, BedDouble, Calendar, Moon, ClipboardList } from "lucide-react";
import {
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
import { CustomSelect } from "@/components/ui/custom-select";
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

const formatCLP = (value: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

type ReportData = Awaited<ReturnType<typeof import("@/lib/queries/reports").getReportData>>;

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  TRANSFER: "Transferencia",
  OTHER: "Otro",
};
const METHOD_COLORS: Record<string, string> = {
  CASH: "var(--success)",
  DEBIT: "#8b5cf6",
  CREDIT: "#7c3aed",
  TRANSFER: "var(--secondary)",
  OTHER: "var(--muted)",
};

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

const MESES: { value: number; label: string }[] = [
  { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
  { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" },
];

const MESES_OPTIONS = MESES.map((m) => ({ value: String(m.value), label: m.label }));

const getYearOptions = () =>
  Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => ({
    value: String(y),
    label: String(y),
  }));

export function AdminReportsView({
  data,
  year,
  month,
}: {
  data: ReportData;
  year: number;
  month: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: es });

  const goToPeriod = useCallback(
    (newYear: number, newMonth: number) => {
      const params = new URLSearchParams();
      params.set("year", String(newYear));
      params.set("month", String(newMonth));
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router]
  );
  const ingresoTotal = data.monthlyTotal;
  const prevTotal = data.prevMonthlyTotal;
  const comparacionMesAnterior = prevTotal
    ? Math.round(((ingresoTotal - prevTotal) / prevTotal) * 100)
    : 0;

  const periodStart = startOfMonth(new Date(year, month - 1, 1));
  const periodEnd = endOfMonth(new Date(year, month - 1, 1));
  const allDaysInMonth = eachDayOfInterval({ start: periodStart, end: periodEnd });

  const dailyIncomeArray = allDaysInMonth.map((day) => {
    const dateStr = day.toISOString().slice(0, 10);
    return {
      fecha: format(day, "d MMM", { locale: es }),
      ingresos: data.dailyIncome[dateStr] ?? 0,
    };
  });
  const dailyOccupancyArray = allDaysInMonth.map((day) => {
    const dateStr = day.toISOString().slice(0, 10);
    return {
      fecha: format(day, "d MMM", { locale: es }),
      ocupacion: data.dailyOccupancy?.[dateStr] ?? 0,
    };
  });

  const paymentBreakdownWithColors = data.paymentBreakdown.map((r) => ({
    name: METHOD_LABELS[r.name] ?? r.name,
    value: r.value,
    color: METHOD_COLORS[r.name] ?? "var(--muted)",
  }));
  const topRoomsFormatted = data.topRooms.map((r) => ({
    habitacion: `Hab. ${r.roomNumber}`,
    reservas: r.count,
  }));
  const ocupacionPromedio =
    dailyOccupancyArray.length > 0
      ? Math.round(
          dailyOccupancyArray.reduce((s, d) => s + d.ocupacion, 0) / dailyOccupancyArray.length
        )
      : 0;
  const prevOcupacionPromedio = data.prevOcupacionPromedio ?? 0;
  const comparacionOcupacion =
    prevOcupacionPromedio > 0
      ? Math.round(((ocupacionPromedio - prevOcupacionPromedio) / prevOcupacionPromedio) * 100)
      : 0;

  const nightsSold = data.nightsSold ?? 0;
  const prevNightsSold = data.prevNightsSold ?? 0;
  const comparacionNoches =
    prevNightsSold > 0
      ? Math.round(((nightsSold - prevNightsSold) / prevNightsSold) * 100)
      : 0;
  const reservationCount = data.reservationCount ?? 0;
  const maxIngresos =
    dailyIncomeArray.length > 0
      ? Math.max(...dailyIncomeArray.map((d) => d.ingresos), 1)
      : 1;
  const domainIngresos = [0, Math.ceil((maxIngresos * 1.1) / 1000) * 1000 || 1000];

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

      {/* Selector de período (diseño personalizado con CustomSelect) */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 shadow-sm">
        <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
          Período consultado
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-month" className="text-xs text-[var(--muted)]">
              Mes
            </label>
            <CustomSelect
              value={String(month)}
              onChange={(v) => v && goToPeriod(year, Number(v))}
              options={MESES_OPTIONS}
              placeholder="Mes"
              className="min-w-[140px]"
              aria-label="Seleccionar mes"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-year" className="text-xs text-[var(--muted)]">
              Año
            </label>
            <CustomSelect
              value={String(year)}
              onChange={(v) => v && goToPeriod(Number(v), month)}
              options={getYearOptions()}
              placeholder="Año"
              className="min-w-[100px]"
              aria-label="Seleccionar año"
            />
          </div>
          <span className="self-end pb-2 text-sm text-[var(--muted)]">
            → Resumen de <span className="font-medium text-[var(--primary)]">{monthLabel}</span>
          </span>
        </div>
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
            description="Habitaciones ocupadas en promedio en el mes"
            trend={
              prevOcupacionPromedio > 0
                ? { value: comparacionOcupacion, isPositive: comparacionOcupacion >= 0 }
                : undefined
            }
          />
          <StatCard
            title="Ingreso total"
            value={formatCLP(ingresoTotal)}
            icon={DollarSign}
            description="Total cobrado en el período"
            trend={
              prevTotal > 0
                ? { value: comparacionMesAnterior, isPositive: comparacionMesAnterior >= 0 }
                : undefined
            }
          />
          <StatCard
            title="Noches vendidas"
            value={String(nightsSold)}
            icon={Moon}
            description="Noches-habitación vendidas en el mes"
            trend={
              prevNightsSold > 0
                ? { value: comparacionNoches, isPositive: comparacionNoches >= 0 }
                : undefined
            }
          />
          <StatCard
            title="Reservas en el mes"
            value={String(reservationCount)}
            icon={ClipboardList}
            description="Reservas con estadía en el período"
          />
        </div>
      </div>

      {/* Gráfico: Ingresos diarios (mismo diseño que Ocupación diaria) */}
      <div className="reports-chart rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 md:p-6 shadow-sm">
        <h3 className="mb-2 text-base font-semibold text-[var(--foreground)]">
          Ingresos diarios del mes
        </h3>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Cuánto entró cada día para ver picos y bajas.
        </p>
        <div className="h-60 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              id="incomeChart"
              syncId="income"
              data={dailyIncomeArray}
              margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
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
                domain={domainIngresos}
                tickFormatter={(v) => formatCLP(v)}
                width={36}
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
              <Area
                type="monotone"
                dataKey="ingresos"
                name="Ingresos"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#colorIngresos)"
              />
            </AreaChart>
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
              data={dailyOccupancyArray}
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
                tickFormatter={(v) => `${v}%`}
                width={36}
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
                  data={paymentBreakdownWithColors}
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
                  {paymentBreakdownWithColors.map((entry, i) => (
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
                data={topRoomsFormatted}
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
