"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, BedDouble, X, User, CreditCard } from "lucide-react";
import { createPortal } from "react-dom";
import { DatePickerInput } from "@/components/ui/date-picker-input";

const ROOM_TYPE_LABELS: Record<string, string> = {
  SINGLE: "Single",
  DOUBLE: "Doble",
  TRIPLE: "Triple",
  QUADRUPLE: "Cuádruple",
  QUINTUPLE: "Quintuple",
  PROMOTIONAL: "Promocional",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CHECKED_IN: "Check-in realizado",
  CHECKED_OUT: "Check-out realizado",
  CANCELLED: "Cancelada",
  NO_SHOW: "No show",
};

const formatCLP = (n: number) =>
  n === 0 ? "—" : new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n);

export type RoomRegisterRow = Awaited<ReturnType<typeof import("@/lib/queries/room-register").getRoomRegister>>[number];

export function RoomRegisterView({
  rows,
  selectedDate,
}: {
  rows: RoomRegisterRow[];
  selectedDate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedRow, setSelectedRow] = useState<RoomRegisterRow | null>(null);

  const handleDateChange = (nextDate: string) => {
    router.push(`${pathname}?date=${nextDate}`);
  };

  const occupiedCount = rows.filter((r) => r.guestName != null).length;
  const totalVenta = rows.reduce((s, r) => s + (r.totalAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Registro de habitaciones
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Vista diaria: quién está en cada habitación, abono y saldo. Reemplazo de la planilla manual.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <Calendar className="h-4 w-4 text-[var(--muted)]" />
            Fecha
          </label>
          <DatePickerInput
            value={selectedDate}
            onChange={handleDateChange}
            placeholder="dd/mm/aaaa"
            aria-label="Fecha del registro"
            className="min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium text-[var(--foreground)]">
            {format(new Date(selectedDate + "T12:00:00"), "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </span>
          <span className="text-[var(--muted)]">
            {occupiedCount} habitación{occupiedCount !== 1 ? "es" : ""} ocupada{occupiedCount !== 1 ? "s" : ""}
          </span>
          {totalVenta > 0 && (
            <span className="font-semibold text-[var(--primary)]">
              Total venta del día: {formatCLP(totalVenta)}
            </span>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/40">
                <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">Habitación</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">Tipo</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">Valor noche</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">Empresa / Pasajero</th>
                <th className="px-4 py-3 text-center font-semibold text-[var(--foreground)]">N° pers.</th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--foreground)]">Tarjeta ingreso</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">Abono</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">Saldo</th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--foreground)]">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.roomId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedRow(row)}
                  onKeyDown={(e) => e.key === "Enter" && setSelectedRow(row)}
                  className={`cursor-pointer border-b border-[var(--border)] transition-colors ${
                    row.guestName ? "bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10" : "hover:bg-[var(--muted)]/20"
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                      <BedDouble className="h-4 w-4 text-[var(--muted)]" />
                      {row.roomNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {ROOM_TYPE_LABELS[row.type] ?? row.type} ({row.maxGuests})
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--foreground)]">
                    {formatCLP(row.pricePerNight)}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {row.guestName ?? <span className="text-[var(--muted)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center tabular-nums">
                    {row.numGuests != null ? row.numGuests : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--muted)]">
                    {row.folioNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.paidAmount != null ? formatCLP(row.paidAmount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.balance != null ? (
                      row.balance > 0 ? (
                        <span className="font-medium text-[var(--primary)]">{formatCLP(row.balance)}</span>
                      ) : (
                        <span className="text-[var(--success)]">{formatCLP(0)}</span>
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {row.totalAmount != null ? formatCLP(row.totalAmount) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedRow && typeof document !== "undefined" &&
        createPortal(
          <DetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />,
          document.body
        )}
    </div>
  );
}

function DetailModal({ row, onClose }: { row: RoomRegisterRow; onClose: () => void }) {
  const d = row.detail;
  const checkIn = d?.checkIn ? new Date(d.checkIn) : null;
  const checkOut = d?.checkOut ? new Date(d.checkOut) : null;

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Habitación {row.roomNumber} — {ROOM_TYPE_LABELS[row.type] ?? row.type}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--muted)]/20 hover:text-[var(--foreground)]"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Valor noche: {formatCLP(row.pricePerNight)} · Hasta {row.maxGuests} personas
        </p>

        {d ? (
          <div className="mt-6 space-y-5">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <User className="h-4 w-4" />
                Reserva y huésped
              </h4>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li>
                  <span className="text-[var(--muted)]">Estado:</span>{" "}
                  {STATUS_LABELS[d.status] ?? d.status}
                </li>
                <li>
                  <span className="text-[var(--muted)]">Entrada:</span>{" "}
                  {checkIn ? format(checkIn, "d MMM yyyy", { locale: es }) : "—"}
                </li>
                <li>
                  <span className="text-[var(--muted)]">Salida:</span>{" "}
                  {checkOut ? format(checkOut, "d MMM yyyy", { locale: es }) : "—"}
                </li>
                <li>
                  <span className="text-[var(--muted)]">Pasajero / Empresa:</span>{" "}
                  {d.guest.fullName}
                  {d.guest.companyName ? ` (${d.guest.companyName})` : ""}
                </li>
                {d.guest.email && (
                  <li>
                    <span className="text-[var(--muted)]">Email:</span> {d.guest.email}
                  </li>
                )}
                {d.guest.phone && (
                  <li>
                    <span className="text-[var(--muted)]">Teléfono:</span> {d.guest.phone}
                  </li>
                )}
                {row.folioNumber && (
                  <li>
                    <span className="text-[var(--muted)]">Tarjeta de ingreso:</span> {row.folioNumber}
                  </li>
                )}
                {d.notes && (
                  <li>
                    <span className="text-[var(--muted)]">Notas:</span> {d.notes}
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <CreditCard className="h-4 w-4" />
                Pagos
              </h4>
              {d.payments.length > 0 ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {d.payments.map((p, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>
                        {format(new Date(p.paidAt), "d MMM yyyy", { locale: es })} — {p.method}
                      </span>
                      <span className="tabular-nums font-medium">{formatCLP(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--muted)]">Sin pagos registrados</p>
              )}
              <div className="mt-3 flex flex-wrap gap-4 border-t border-[var(--border)] pt-3 text-sm">
                <span>
                  <span className="text-[var(--muted)]">Abono total:</span>{" "}
                  {formatCLP(row.paidAmount ?? 0)}
                </span>
                <span>
                  <span className="text-[var(--muted)]">Saldo:</span>{" "}
                  <span className={row.balance && row.balance > 0 ? "font-medium text-[var(--primary)]" : ""}>
                    {formatCLP(row.balance ?? 0)}
                  </span>
                </span>
                <span className="font-semibold">
                  <span className="text-[var(--muted)]">Total:</span> {formatCLP(row.totalAmount ?? 0)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-4 text-center text-sm text-[var(--muted)]">
            Sin ocupación para la fecha seleccionada.
          </div>
        )}
      </div>
    </div>
  );
}
