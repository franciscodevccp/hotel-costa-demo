"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, BedDouble, X, User, CreditCard, FileImage, Receipt } from "lucide-react";
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
  const d = row.detail as RoomRegisterRow["detail"] & {
    folioNumber?: string | null;
    processedByName?: string | null;
    entryCardImageUrl?: string | null;
    payments?: { amount: number; paidAt: Date; method: string; receipt_urls?: string[]; receipt_entries?: { url: string; amount: number; method: string }[] }[];
    consumptions?: { id: string; consumptionNumber: string; description: string | null; amount: number; method: string; cardImageUrl: string | null; createdAt: Date }[];
  } | null;
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const checkIn = d?.checkIn ? new Date(d.checkIn) : null;
  const checkOut = d?.checkOut ? new Date(d.checkOut) : null;
  const hasReceipts = d?.payments?.some((p) => ((p as { receipt_urls?: string[] }).receipt_urls?.length ?? 0) > 0) ?? false;
  const METHOD_LABELS: Record<string, string> = { CASH: "Efectivo", DEBIT: "Débito", CREDIT: "Crédito", TRANSFER: "Transferencia", OTHER: "Otro" };

  return (
    <>
      <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--card)] px-6 py-4">
            <div>
              <h3 className="text-xl font-semibold text-[var(--foreground)]">
                Habitación {row.roomNumber} — {ROOM_TYPE_LABELS[row.type] ?? row.type}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-[var(--muted)]">
                <span>Valor noche: {formatCLP(row.pricePerNight)}</span>
                <span>Hasta {row.maxGuests} personas</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--muted)]/20 hover:text-[var(--foreground)]"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {d ? (
            <div className="space-y-0">
              {/* Fila 1: Reserva + Tarjeta de ingreso en 2 columnas */}
              <div className="grid gap-4 p-6 md:grid-cols-2">
                <section className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    <User className="h-4 w-4" />
                    Reserva y huésped
                  </h4>
                  <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[var(--muted)]">Estado</dt>
                      <dd className="font-medium">{STATUS_LABELS[d.status] ?? d.status}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Entrada</dt>
                      <dd className="font-medium">{checkIn ? format(checkIn, "d MMM yyyy", { locale: es }) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Salida</dt>
                      <dd className="font-medium">{checkOut ? format(checkOut, "d MMM yyyy", { locale: es }) : "—"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[var(--muted)]">Pasajero / Empresa</dt>
                      <dd className="font-medium">
                        {d.guest.fullName}
                        {d.guest.companyName ? ` (${d.guest.companyName})` : ""}
                      </dd>
                    </div>
                    {d.guest.email && (
                      <div className="sm:col-span-2">
                        <dt className="text-[var(--muted)]">Email</dt>
                        <dd className="font-medium">{d.guest.email}</dd>
                      </div>
                    )}
                    {d.guest.phone && (
                      <div>
                        <dt className="text-[var(--muted)]">Teléfono</dt>
                        <dd className="font-medium">{d.guest.phone}</dd>
                      </div>
                    )}
                    {d.notes && (
                      <div className="sm:col-span-2">
                        <dt className="text-[var(--muted)]">Notas</dt>
                        <dd className="font-medium">{d.notes}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                <section className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    <FileImage className="h-4 w-4" />
                    Tarjeta de ingreso
                  </h4>
                  {(d.folioNumber ?? row.folioNumber) || d.processedByName || d.entryCardImageUrl ? (
                    <div className="space-y-3">
                      {(d.folioNumber ?? row.folioNumber) && (
                        <div>
                          <span className="text-xs text-[var(--muted)]">Folio</span>
                          <p className="font-medium">{d.folioNumber ?? row.folioNumber}</p>
                        </div>
                      )}
                      {d.processedByName && (
                        <div>
                          <span className="text-xs text-[var(--muted)]">Gestionada por</span>
                          <p className="font-medium">{d.processedByName}</p>
                        </div>
                      )}
                      {d.entryCardImageUrl && (
                        <div>
                          <span className="mb-1 block text-xs text-[var(--muted)]">Foto firmada</span>
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(d.entryCardImageUrl!)}
                            className="rounded-lg overflow-hidden border border-[var(--border)] w-20 h-20 hover:ring-2 hover:ring-[var(--primary)]"
                          >
                            <img src={d.entryCardImageUrl} alt="Tarjeta de ingreso" className="h-full w-full object-cover" />
                          </button>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">Clic para ampliar</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">Sin tarjeta registrada</p>
                  )}
                </section>
              </div>

              {/* Pagos: resumen destacado + lista */}
              <section className="border-t border-[var(--border)] bg-[var(--background)]/20 px-6 py-4">
                <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <CreditCard className="h-4 w-4" />
                  Pagos
                </h4>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="mb-4 grid grid-cols-3 gap-4 rounded-lg bg-[var(--primary)]/10 px-4 py-3 text-center">
                    <div>
                      <p className="text-xs text-[var(--muted)]">Abonado</p>
                      <p className="text-lg font-semibold tabular-nums">{formatCLP(row.paidAmount ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Saldo pendiente</p>
                      <p className={`text-lg font-semibold tabular-nums ${row.balance && row.balance > 0 ? "text-[var(--primary)]" : ""}`}>
                        {formatCLP(row.balance ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">Total</p>
                      <p className="text-lg font-semibold tabular-nums">{formatCLP(row.totalAmount ?? 0)}</p>
                    </div>
                  </div>
                  {d.payments && d.payments.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {d.payments.map((p, i) => (
                        <li key={i} className="flex justify-between gap-2 border-b border-[var(--border)]/60 pb-2 last:border-0 last:pb-0">
                          <span className="text-[var(--muted)]">
                            {format(new Date(p.paidAt), "d MMM yyyy", { locale: es })} — {p.method}
                          </span>
                          <span className="tabular-nums font-medium">{formatCLP(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--muted)]">Sin pagos registrados</p>
                  )}
                </div>
              </section>

              {/* Comprobantes de pago */}
              {hasReceipts && (
                <section className="border-t border-[var(--border)] px-6 py-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                    <Receipt className="h-4 w-4" />
                    Comprobantes de pago
                  </h4>
                  <div className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/30 p-3">
                    {d.payments!.flatMap((p, payIdx) => {
                      const urls = (p as { receipt_urls?: string[] }).receipt_urls ?? [];
                      const entries = (p as { receipt_entries?: { url: string; amount: number; method: string }[] }).receipt_entries ?? [];
                      const entryByUrl = new Map(entries.map((e) => [e.url, e]));
                      return urls.map((url, i) => {
                        const entry = entryByUrl.get(url);
                        const amount = entry?.amount ?? p.amount;
                        const method = entry?.method ?? p.method;
                        return (
                          <div key={`${payIdx}-${i}`} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2">
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(url)}
                              className="rounded overflow-hidden w-12 h-12 flex-shrink-0 hover:ring-2 hover:ring-[var(--primary)]"
                            >
                              <img src={url} alt="Comprobante" className="h-full w-full object-cover" />
                            </button>
                            <div>
                              <p className="text-sm font-medium leading-tight">{formatCLP(amount)} · {METHOD_LABELS[method] ?? method}</p>
                              <p className="text-xs text-[var(--muted)]">Clic para ampliar</p>
                            </div>
                          </div>
                        );
                      });
                    })}
                  </div>
                </section>
              )}

              {/* Tarjeta de consumo */}
              <section className="border-t border-[var(--border)] px-6 py-4 pb-6">
                <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <Receipt className="h-4 w-4" />
                  Tarjeta de consumo
                </h4>
                {d.consumptions && d.consumptions.length > 0 ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 p-3">
                    <ul className="space-y-3">
                      {d.consumptions.map((c) => (
                        <li key={c.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)]/60 bg-[var(--card)] p-2">
                          {c.cardImageUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(c.cardImageUrl!)}
                              className="rounded overflow-hidden w-12 h-12 flex-shrink-0 hover:ring-2 hover:ring-[var(--primary)]"
                            >
                              <img src={c.cardImageUrl} alt="Consumo" className="h-full w-full object-cover" />
                            </button>
                          ) : (
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--muted)]/20 text-xs text-[var(--muted)]">—</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">N° {c.consumptionNumber}{c.description ? ` · ${c.description}` : ""} — {formatCLP(c.amount)}</p>
                            <p className="text-xs text-[var(--muted)]">{METHOD_LABELS[c.method] ?? c.method}{c.cardImageUrl ? " · Clic para ampliar" : ""}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="rounded-xl border border-[var(--border)] bg-[var(--background)]/30 px-4 py-3 text-sm text-[var(--muted)]">Sin consumos registrados</p>
                )}
              </section>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-6 text-center text-sm text-[var(--muted)] mx-6 mb-6">
              Sin ocupación para la fecha seleccionada.
            </div>
          )}
        </div>
      </div>

      {/* Modal imagen en grande */}
      {previewImageUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPreviewImageUrl(null)}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Cerrar"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={previewImageUrl}
              alt="Vista ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}
    </>
  );
}
