"use client";

import { useState, useEffect } from "react";
import { X, ImagePlus } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import { registerFirstPayment } from "@/app/dashboard/payments/actions";

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

/** Formato con separador de miles (punto, es-CL) para el input de monto */
function formatThousands(digits: string): string {
  if (!digits || digits === "") return "";
  const num = parseInt(digits.replace(/\D/g, ""), 10);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("es-CL", { maximumFractionDigits: 0 });
}

export type FirstPaymentReservation = {
  reservationId: string;
  guestName: string;
  roomNumber: string;
  totalAmount: number;
};

export function FirstPaymentModal({
  reservation,
  onClose,
  onSaved,
}: {
  reservation: FirstPaymentReservation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(reservation.totalAmount).replace(/\D/g, ""));
  const [method, setMethod] = useState<"CASH" | "DEBIT" | "CREDIT" | "TRANSFER" | "OTHER">("CASH");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const methodRequiresReceipt = ["TRANSFER", "DEBIT", "CREDIT", "OTHER"].includes(method);

  useEffect(() => {
    setAmount(String(reservation.totalAmount).replace(/\D/g, ""));
  }, [reservation.reservationId, reservation.totalAmount]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNum = parseInt(amount.replace(/\D/g, ""), 10) || 0;
    if (amountNum <= 0) {
      setError("Ingrese un monto válido");
      return;
    }
    if (methodRequiresReceipt && amountNum > 0 && !receiptFile) {
      setError("Debe subir el comprobante de pago (transferencia, débito, crédito u otro).");
      return;
    }
    setSaving(true);
    let receiptUrl: string | null = null;
    let receiptHash: string | null = null;
    if (receiptFile) {
      try {
        const fd = new FormData();
        fd.append("photo", receiptFile);
        const res = await fetch("/api/upload/payment-receipt", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok || !data.url) {
          setSaving(false);
          setError(data.error || "Error al subir el comprobante");
          return;
        }
        receiptUrl = data.url;
        receiptHash = data.hash ?? null;
      } catch (err) {
        setSaving(false);
        setError(err instanceof Error ? err.message : "Error al subir el comprobante");
        return;
      }
    }
    const result = await registerFirstPayment(reservation.reservationId, amountNum, method, receiptUrl, receiptHash);
    setSaving(false);
    if (result?.error) {
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
      aria-labelledby="first-payment-title"
    >
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h3 id="first-payment-title" className="text-lg font-semibold text-[var(--foreground)]">
            Registrar primer pago
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

        <form onSubmit={handleSubmit} className="p-4">
          <p className="text-sm text-[var(--muted)]">
            Esta reserva no tiene pagos registrados. Indique el monto y el método para crear el registro.
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <p className="font-medium text-[var(--foreground)]">
                {reservation.guestName} · Hab. {reservation.roomNumber}
              </p>
              <p className="text-sm text-[var(--muted)]">
                Total reserva: {formatCLP(reservation.totalAmount)}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                Monto (CLP)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formatThousands(amount)}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder={formatThousands(String(reservation.totalAmount))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)]">
                Método
              </label>
              <CustomSelect
                value={method}
                onChange={(v) => {
                  setMethod(v as typeof method);
                  if (v === "CASH") setReceiptFile(null);
                }}
                options={(["CASH", "DEBIT", "CREDIT", "TRANSFER", "OTHER"] as const).map((m) => ({
                  value: m,
                  label: METHOD_LABELS[m.toLowerCase()],
                }))}
                placeholder="Método"
                className="w-full"
              />
            </div>
            {methodRequiresReceipt && (
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">
                  Comprobante de pago *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="first-payment-receipt"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor="first-payment-receipt"
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)]/60 px-4 py-3 text-sm text-[var(--muted)] hover:bg-[var(--muted)]/10 cursor-pointer"
                >
                  <ImagePlus className="h-4 w-4" />
                  {receiptFile ? receiptFile.name : "Subir comprobante (transferencia, débito, crédito)"}
                </label>
                <p className="mt-0.5 text-xs text-[var(--muted)]">Obligatorio cuando el método no es efectivo.</p>
              </div>
            )}
          </div>
          {error && (
            <p className="mt-3 text-sm text-[var(--destructive)]">{error}</p>
          )}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                saving ||
                !(parseInt(amount.replace(/\D/g, ""), 10) > 0) ||
                (methodRequiresReceipt && !receiptFile)
              }
              className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--primary)]/90 disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
