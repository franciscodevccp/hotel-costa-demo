"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { completePaymentWithRest, type PaymentMethodValue } from "@/app/dashboard/payments/actions";
import type { PaymentRow } from "./admin-payments-view";

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
  other: "Otro",
};

function formatCLP(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

/** Formato con separador de miles (punto, es-CL) para inputs de monto */
function formatThousands(digits: string): string {
  if (!digits || digits === "") return "";
  const num = parseInt(digits.replace(/\D/g, ""), 10);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("es-CL", { maximumFractionDigits: 0 });
}

export function EditPaymentModal({
  payment,
  payments,
  onClose,
  onSaved,
}: {
  payment: PaymentRow;
  payments: PaymentRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [addingNew, setAddingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalReserva = payment.total_amount ?? payment.amount;
  const paymentsOfReservation = payments.filter(
    (p) => p.reservation_id === payment.reservation_id
  );
  const totalPagado = paymentsOfReservation.reduce((s, p) => s + p.amount, 0);
  const pendiente = Math.max(0, totalReserva - totalPagado);

  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [useSameMethodAsAbono, setUseSameMethodAsAbono] = useState(true);
  const [newPaymentMethod, setNewPaymentMethod] = useState(payment.method);

  const paymentsOfReservationSorted = [...paymentsOfReservation].sort(
    (a, b) => new Date(a.paid_at).getTime() - new Date(b.paid_at).getTime()
  );
  const metodoAbonoInicial = paymentsOfReservationSorted[0]?.method ?? payment.method;

  const editingDisabled = payment.reservation_status === "pending";

  // Pre-llenar "Monto a registrar" solo al abrir el modal; no resetear cuando cambia pendiente, para no pisar lo que escribe el usuario (ej. 20.000)
  useEffect(() => {
    const totalReserva = payment.total_amount ?? payment.amount;
    const otrosPagos = paymentsOfReservation
      .filter((p) => p.id !== payment.id)
      .reduce((s, p) => s + p.amount, 0);
    const totalPagadoInicial = otrosPagos + payment.amount;
    const pendInicial = Math.max(0, totalReserva - totalPagadoInicial);
    setNewPaymentAmount(String(pendInicial));
  }, [payment.id]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  async function handleAddNewPayment() {
    setError(null);
    const num = parseInt(newPaymentAmount.replace(/\D/g, ""), 10);
    if (Number.isNaN(num) || num <= 0) {
      setError("Ingrese un monto válido para el nuevo pago");
      return;
    }
    if (num > pendiente) {
      setError(`El monto no puede superar lo pendiente (${formatCLP(pendiente)})`);
      return;
    }
    setAddingNew(true);
    const methodToUse = useSameMethodAsAbono ? metodoAbonoInicial : newPaymentMethod;
    const result = await completePaymentWithRest(
      payment.id,
      num,
      methodToUse.toUpperCase() as PaymentMethodValue
    );
    setAddingNew(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-screen items-center justify-center p-4"
      style={{ minHeight: "100dvh" }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop: no cerrar al hacer clic fuera (solo X, Cancelar o Escape) */}
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div
        className="relative z-10 w-full max-w-md md:max-w-2xl lg:max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sticky top-0 bg-[var(--card)] z-10">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {pendiente > 0 ? "Pago pendiente" : "Detalle del pago"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 md:p-6">
          {editingDisabled && (
            <div className="mb-4 rounded-lg border border-[var(--warning)]/50 bg-[var(--warning)]/10 p-4 text-sm text-[var(--foreground)]">
              La reserva está pendiente de confirmación. Confirme la reserva en <strong>Reservaciones</strong> para habilitar la edición del estado de pago y registrar pagos.
            </div>
          )}
          <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start space-y-4 md:space-y-0">
            {/* Columna izquierda: datos + resumen */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[var(--muted)]">Fecha</span>
                  <p className="font-medium text-[var(--foreground)]">
                    {formatDateTime(payment.paid_at)}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--muted)]">Habitación</span>
                  <p className="font-medium text-[var(--foreground)]">
                    {payment.room_number}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-[var(--muted)]">Huésped</span>
                  <p className="font-medium text-[var(--foreground)]">
                    {payment.guest_name}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-[var(--muted)]">Registrado por</span>
                  <p className="font-medium text-[var(--foreground)]">
                    {payment.registered_by}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Total de la reserva</span>
                  <span className="font-semibold text-[var(--foreground)]">
                    {formatCLP(totalReserva)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Total pagado</span>
                  <span className="font-medium text-[var(--foreground)]">
                    {formatCLP(totalPagado)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-[var(--border)]">
                  <span className="text-[var(--muted)]">Pendiente</span>
                  <span
                    className={`font-semibold text-xl ${pendiente > 0 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}
                  >
                    {formatCLP(pendiente)}
                  </span>
                </div>
              </div>
            </div>

            {/* Columna derecha: registrar pago pendiente */}
            <div className="space-y-4">
          {/* Registrar pago pendiente (flujo principal cuando hay pendiente) */}
          {pendiente > 0 && (
            <div className="rounded-lg border-2 border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 space-y-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Registrar el resto del pago
              </p>
              <p className="text-xs text-[var(--muted)]">
                Ingrese el monto que está pagando ahora y elija si usa el mismo método que el abono inicial o otro.
              </p>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  Monto a registrar
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatThousands(newPaymentAmount)}
                  onChange={(e) => setNewPaymentAmount(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder={formatThousands(String(pendiente))}
                />
              </div>
              <div>
                <span className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                  ¿Con qué método paga?
                </span>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 has-[:checked]:border-[var(--primary)] has-[:checked]:ring-2 has-[:checked]:ring-[var(--primary)]/20">
                    <input
                      type="radio"
                      name="paymentMethodChoice"
                      checked={useSameMethodAsAbono}
                      onChange={() => setUseSameMethodAsAbono(true)}
                      className="h-4 w-4 border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">
                      Mismo método que el abono inicial ({METHOD_LABELS[metodoAbonoInicial]})
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 has-[:checked]:border-[var(--primary)] has-[:checked]:ring-2 has-[:checked]:ring-[var(--primary)]/20">
                    <input
                      type="radio"
                      name="paymentMethodChoice"
                      checked={!useSameMethodAsAbono}
                      onChange={() => setUseSameMethodAsAbono(false)}
                      className="h-4 w-4 border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">Otro método</span>
                  </label>
                  {!useSameMethodAsAbono && (
                    <div className="pl-7 pt-1">
                      <CustomSelect
                        value={newPaymentMethod}
                        onChange={(v) => setNewPaymentMethod(v as typeof newPaymentMethod)}
                        placeholder="Seleccionar método"
                        options={(Object.keys(METHOD_LABELS) as (keyof typeof METHOD_LABELS)[]).map((m) => ({
                          value: m,
                          label: METHOD_LABELS[m],
                        }))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddNewPayment}
                disabled={editingDisabled || addingNew}
                className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {addingNew ? "Registrando…" : "Registrar pago"}
              </button>
            </div>
          )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 mt-4" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-4 md:pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:opacity-90"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
