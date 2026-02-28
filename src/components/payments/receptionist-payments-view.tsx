"use client";

import { useState } from "react";
import { Search, DollarSign, Calendar, Clock } from "lucide-react";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PaymentRow } from "./admin-payments-view";

type PaymentMethod = "cash" | "debit" | "credit" | "transfer" | "other";
type PaymentStatus = "completed" | "partial" | "pending" | "refunded";

const METHOD_COLORS: Record<PaymentMethod, string> = {
  cash: "var(--success)",
  debit: "#8b5cf6",
  credit: "#7c3aed",
  transfer: "var(--secondary)",
  other: "var(--muted)",
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
  other: "Otro",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  partial: "Pago de abono",
  completed: "Pago total",
  refunded: "Reembolsado",
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  completed: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
  partial: "bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20",
  pending: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
  refunded: "bg-[var(--muted)]/10 text-[var(--muted)] border-[var(--muted)]/20",
};

export function ReceptionistPaymentsView({ payments }: { payments: PaymentRow[] }) {
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const formatCLP = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const today = new Date().toISOString().slice(0, 10);
  const paymentsToday = payments.filter(
    (p) => p.paid_at.startsWith(today) && (p.status === "completed" || p.status === "partial")
  );
  const totalToday = paymentsToday.reduce((s, p) => s + p.amount, 0);
  const totalMonth = payments
    .filter((p) => p.status === "completed" || p.status === "partial")
    .reduce((s, p) => s + p.amount, 0);
  const totalPending = payments
    .filter((p) => p.status === "partial" && p.total_amount != null)
    .reduce((s, p) => s + (p.total_amount! - p.amount), 0);

  const byMethod = (["cash", "debit", "credit", "transfer", "other"] as const)
    .map((method) => ({
      name: METHOD_LABELS[method],
      value: payments.filter(
        (p) => p.method === method && (p.status === "completed" || p.status === "partial")
      ).reduce((s, p) => s + p.amount, 0),
      color: METHOD_COLORS[method],
    }))
    .filter((d) => d.value > 0);

  let filtered = payments;
  if (methodFilter)
    filtered = filtered.filter((p) => p.method === methodFilter);
  if (statusFilter)
    filtered = filtered.filter((p) => p.status === statusFilter);
  if (dateFrom)
    filtered = filtered.filter((p) => p.paid_at.slice(0, 10) >= dateFrom);
  if (dateTo)
    filtered = filtered.filter((p) => p.paid_at.slice(0, 10) <= dateTo);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.guest_name.toLowerCase().includes(q) ||
        p.room_number.includes(q)
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Pagos
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Consulta los pagos registrados al crear reservas
        </p>
      </div>

      {/* Resumen: tres tarjetas numéricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-xl border border-[var(--success)]/20 bg-gradient-to-br from-[var(--success)]/5 to-[var(--success)]/10 p-3 md:p-5 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="rounded-lg bg-[var(--success)]/20 p-2 md:p-2.5">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-[var(--success)]" />
            </div>
            <p className="text-xs md:text-sm font-medium text-[var(--muted)]">
              Cobrado hoy
            </p>
          </div>
          <p className="mt-2 md:mt-3 text-xl md:text-2xl font-bold tracking-tight text-[var(--success)]">
            {formatCLP(totalToday)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 p-3 md:p-5 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="rounded-lg bg-[var(--primary)]/20 p-2 md:p-2.5">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[var(--primary)]" />
            </div>
            <p className="text-xs md:text-sm font-medium text-[var(--muted)]">
              Cobrado mes
            </p>
          </div>
          <p className="mt-2 md:mt-3 text-xl md:text-2xl font-bold tracking-tight text-[var(--primary)]">
            {formatCLP(totalMonth)}
          </p>
        </div>
        <div className="col-span-2 md:col-span-1 rounded-xl border border-[var(--warning)]/20 bg-gradient-to-br from-[var(--warning)]/5 to-[var(--warning)]/10 p-3 md:p-5 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="rounded-lg bg-[var(--warning)]/20 p-2 md:p-2.5">
              <Clock className="h-4 w-4 md:h-5 md:w-5 text-[var(--warning)]" />
            </div>
            <p className="text-xs md:text-sm font-medium text-[var(--muted)]">
              Pagos pendientes
            </p>
          </div>
          <p className="mt-2 md:mt-3 text-xl md:text-2xl font-bold tracking-tight text-[var(--warning)]">
            {formatCLP(totalPending)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Por cobrar (abonos parciales)
          </p>
        </div>
      </div>

      {/* Gráfico por método de pago: fila propia, con etiquetas y leyenda estética */}
      <div className="payments-chart rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm min-h-[280px] flex flex-col">
        <p className="text-sm font-medium text-[var(--muted)] mb-4">
          Por método de pago
        </p>
        {byMethod.length > 0 ? (
          <div className="flex-1 min-h-[220px] w-full flex flex-col gap-6 md:flex-row md:items-center">
            <div className="md:flex-1 h-48 md:h-56 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 28, right: 20, bottom: 28, left: 20 }}>
                  <Pie
                    data={byMethod}
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="72%"
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    isAnimationActive={true}
                    animationDuration={500}
                    animationBegin={0}
                    labelLine={false}
                    label={({ percent }) =>
                      percent != null ? `${Math.round(percent * 100)}%` : ""
                    }
                  >
                    {byMethod.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) =>
                      v != null ? formatCLP(Number(v)) : ""
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="md:w-64 space-y-2">
              {byMethod.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-[var(--foreground)]">
                      {item.name}
                    </span>
                  </span>
                  <span className="text-sm text-[var(--muted)]">
                    {formatCLP(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">Sin datos</p>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Buscar por huésped o habitación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <CustomSelect
          value={methodFilter}
          onChange={setMethodFilter}
          placeholder="Todos los métodos"
          options={(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => ({
            value: m,
            label: METHOD_LABELS[m],
          }))}
          className="min-w-[160px]"
        />
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Todos los estados"
          options={(Object.keys(STATUS_LABELS) as PaymentStatus[]).map((s) => ({
            value: s,
            label: STATUS_LABELS[s],
          }))}
          className="min-w-[160px]"
        />
        <DatePickerInput
          value={dateFrom}
          onChange={setDateFrom}
          placeholder="Desde"
          aria-label="Fecha desde"
          className="min-w-[140px]"
        />
        <DatePickerInput
          value={dateTo}
          onChange={setDateTo}
          placeholder="Hasta"
          aria-label="Fecha hasta"
          className="min-w-[140px]"
        />
      </div>

      {/* Tabla */}
      {/* Tabla y Adaptación Móvil */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        {/* Vista Móvil: Tarjetas */}
        <div className="md:hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted)]">
              No hay pagos que coincidan con los filtros
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filtered.map((p) => (
                <div key={p.id} className="p-4 space-y-3">
                  {/* Cabecera: Fecha y Monto */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--muted)] font-medium">
                      {formatDateTime(p.paid_at)}
                    </span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-[var(--foreground)]">
                        {formatCLP(p.amount)}
                      </span>
                      {p.total_amount != null && p.status === "partial" && (
                        <p className="text-xs text-[var(--warning)]">
                          Total: {formatCLP(p.total_amount)} · Pendiente: {formatCLP(p.total_amount - p.amount)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Detalles principales */}
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{p.guest_name}</p>
                    <p className="text-sm text-[var(--muted)]">Habitación {p.room_number}</p>
                  </div>

                  {/* Badges y Pie */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${METHOD_COLORS[p.method]}15`,
                          color: METHOD_COLORS[p.method],
                          borderColor: `${METHOD_COLORS[p.method]}30`,
                        }}
                      >
                        {METHOD_LABELS[p.method]}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status]}`}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--muted)]">
                      Por: {p.registered_by.split(' ')[0]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vista Desktop: Tabla */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                  Huésped
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                  Habitación
                </th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">
                  Monto / Total
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                  Método
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                  Estado
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">
                  Registrado por
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-[var(--muted)]"
                  >
                    No hay pagos que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50"
                  >
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatDateTime(p.paid_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {p.guest_name}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {p.room_number}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--foreground)]">
                      {p.total_amount != null && p.status === "partial" ? (
                        <span>
                          {formatCLP(p.amount)}{" "}
                          <span className="text-[var(--muted)] font-normal">
                            / {formatCLP(p.total_amount)} — Pendiente: {formatCLP(p.total_amount - p.amount)}
                          </span>
                        </span>
                      ) : (
                        formatCLP(p.amount)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${METHOD_COLORS[p.method]}20`,
                          color: METHOD_COLORS[p.method],
                          borderColor: `${METHOD_COLORS[p.method]}40`,
                        }}
                      >
                        {METHOD_LABELS[p.method]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status]}`}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {p.registered_by}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
