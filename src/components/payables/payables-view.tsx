"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { createPortal } from "react-dom";
import {
  Banknote,
  Plus,
  Search,
  Pencil,
  Trash2,
  CreditCard,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { createPayable, updatePayable, deletePayable, addPayablePayment } from "@/app/dashboard/payables/actions";
import { DatePickerInput } from "@/components/ui/date-picker-input";

export type PayableRow = {
  id: string;
  creditorName: string;
  amount: number;
  entryDate: string | null;
  dueDate: string | null;
  invoiceNumber?: string;
  notes?: string;
  paidAmount: number;
  pendingAmount: number;
  payments: { id: string; amount: number; paidAt: string; notes?: string }[];
};

const formatCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n);
const formatThousands = (n: number) => (n > 0 ? n.toLocaleString("es-CL") : "");
const parseAmountInput = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 0;
const formatDate = (d: string) => format(new Date(d + "T12:00:00"), "d MMM yyyy", { locale: es });

export function PayablesView({ payables }: { payables: PayableRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<PayableRow | null>(null);
  const [paymentFor, setPaymentFor] = useState<PayableRow | null>(null);
  const [deleteItem, setDeleteItem] = useState<PayableRow | null>(null);
  const [createState, createAction] = useActionState(createPayable, {});
  const [createAmount, setCreateAmount] = useState(0);
  const [createEntryDate, setCreateEntryDate] = useState("");
  const [createDueDate, setCreateDueDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentNotes, setPaymentNotes] = useState("");

  const filtered = search.trim()
    ? payables.filter(
        (p) =>
          p.creditorName.toLowerCase().includes(search.toLowerCase()) ||
          (p.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : payables;

  const totalPending = filtered.reduce((s, p) => s + p.pendingAmount, 0);

  useEffect(() => {
    if (createState?.success) {
      setCreateOpen(false);
      setCreateAmount(0);
      setCreateEntryDate("");
      setCreateDueDate("");
      router.refresh();
    }
  }, [createState?.success, router]);

  const createDaysBetween = (() => {
    if (!createEntryDate || !createDueDate) return null;
    const from = new Date(createEntryDate + "T12:00:00");
    const to = new Date(createDueDate + "T12:00:00");
    const days = differenceInDays(to, from);
    return days >= 0 ? days : null;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Por pagar</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Cuentas por pagar manuales (proveedores o acreedores a los que les debemos). Solo administrador.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[var(--primary)]/20 p-2.5">
            <Banknote className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--muted)]">Total pendiente por pagar</p>
            <p className="text-2xl font-bold text-[var(--primary)]">{formatCLP(totalPending)}</p>
            <p className="text-xs text-[var(--muted)]">{filtered.length} cuenta(s) en la lista</p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
        <div className="border-b border-[var(--border)] bg-[var(--background)] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Buscar por proveedor o n° factura..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Nueva cuenta por pagar
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Proveedor</th>
                <th className="px-4 py-3 font-semibold text-[var(--foreground)] text-right">Monto total</th>
                <th className="px-4 py-3 font-semibold text-[var(--foreground)] text-right">Pagado</th>
                <th className="px-4 py-3 font-semibold text-[var(--foreground)] text-right">Pendiente</th>
                <th className="px-4 py-3 font-semibold text-[var(--foreground)]">F. ingreso</th>
                <th className="px-4 py-3 font-semibold text-[var(--foreground)]">F. venc.</th>
                <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Factura</th>
                <th className="px-4 py-3 font-semibold text-[var(--foreground)] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--muted)]">
                    {payables.length === 0
                      ? "No hay cuentas por pagar. Use «Nueva cuenta por pagar» para agregar."
                      : "Ningún resultado con la búsqueda."}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] hover:bg-[var(--background)]/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--foreground)]">{p.creditorName}</p>
                      {p.notes && <p className="text-xs text-[var(--muted)] truncate max-w-[180px]">{p.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCLP(p.amount)}</td>
                    <td className="px-4 py-3 text-right text-[var(--muted)]">{formatCLP(p.paidAmount)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={p.pendingAmount > 0 ? "font-semibold text-[var(--primary)]" : "text-[var(--success)]"}>
                        {formatCLP(p.pendingAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{p.entryDate ? formatDate(p.entryDate) : "—"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {p.dueDate ? formatDate(p.dueDate) : "—"}
                      {p.entryDate && p.dueDate && (() => {
                        const days = differenceInDays(new Date(p.dueDate + "T12:00:00"), new Date(p.entryDate + "T12:00:00"));
                        if (days >= 0) return <><br /><span className="text-xs text-[var(--primary)]">{days} día{days !== 1 ? "s" : ""}</span></>;
                        return null;
                      })()}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{p.invoiceNumber ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {p.pendingAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentFor(p);
                              setPaymentAmount("");
                              setPaymentDate(format(new Date(), "yyyy-MM-dd"));
                              setPaymentNotes("");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--primary)]/50 bg-[var(--primary)]/10 px-2.5 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Pago
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditItem(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--muted)]/10"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteItem(p)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 px-2.5 py-1.5 text-xs font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {createOpen && typeof document !== "undefined" &&
        createPortal(
          <ModalBackdrop onClose={() => setCreateOpen(false)}>
            <form action={createAction} className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Nueva cuenta por pagar</h3>
              {createState?.error && (
                <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{createState.error}</p>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">A quién le debemos (proveedor) *</label>
                <input name="creditorName" required placeholder="Ej. Proveedor XYZ" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Monto total (CLP) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="40.000"
                  value={formatThousands(createAmount)}
                  onChange={(e) => setCreateAmount(parseAmountInput(e.target.value))}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <input type="hidden" name="amount" value={createAmount || ""} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Fecha de ingreso</label>
                <DatePickerInput
                  value={createEntryDate}
                  onChange={setCreateEntryDate}
                  placeholder="dd/mm/aaaa"
                  aria-label="Fecha de ingreso"
                  className="w-full"
                />
                <input type="hidden" name="entryDate" value={createEntryDate} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Fecha de vencimiento</label>
                <DatePickerInput
                  value={createDueDate}
                  onChange={setCreateDueDate}
                  placeholder="dd/mm/aaaa"
                  aria-label="Fecha de vencimiento"
                  className="w-full"
                />
                <input type="hidden" name="dueDate" value={createDueDate} />
              </div>
              {createDaysBetween != null && (
                <p className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3 py-2 text-sm font-medium text-[var(--primary)]">
                  Quedan <strong>{createDaysBetween}</strong> día{createDaysBetween !== 1 ? "s" : ""} entre ingreso y vencimiento.
                </p>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">N° factura / orden</label>
                <input name="invoiceNumber" placeholder="Ej. F-001234" className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Notas</label>
                <textarea name="notes" rows={2} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)]">
                  Cancelar
                </button>
                <button type="submit" disabled={createAmount < 1} className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed">
                  Crear
                </button>
              </div>
            </form>
          </ModalBackdrop>,
          document.body
        )}

      {editItem && typeof document !== "undefined" &&
        createPortal(
          <EditModal
            item={editItem}
            onClose={() => setEditItem(null)}
            onSuccess={() => { setEditItem(null); router.refresh(); }}
          />,
          document.body
        )}

      {paymentFor && typeof document !== "undefined" &&
        createPortal(
          <PaymentModal
            payable={paymentFor}
            onClose={() => setPaymentFor(null)}
            onSuccess={() => { setPaymentFor(null); router.refresh(); }}
            initialAmount={paymentAmount}
            initialDate={paymentDate}
            initialNotes={paymentNotes}
            setAmount={setPaymentAmount}
            setDate={setPaymentDate}
            setNotes={setPaymentNotes}
          />,
          document.body
        )}

      {deleteItem && typeof document !== "undefined" &&
        createPortal(
          <ModalBackdrop onClose={() => setDeleteItem(null)}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">Eliminar cuenta por pagar</h3>
              <p className="text-sm text-[var(--muted)]">
                ¿Eliminar a <strong>{deleteItem.creditorName}</strong> y todo el historial de pagos? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeleteItem(null)} className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await deletePayable(deleteItem.id);
                    if (res?.success) { setDeleteItem(null); router.refresh(); } else if (res?.error) alert(res.error);
                  }}
                  className="flex-1 rounded-lg bg-[var(--destructive)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </ModalBackdrop>,
          document.body
        )}
    </div>
  );
}

function ModalBackdrop({ children }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

function EditModal({
  item,
  onClose,
  onSuccess,
}: {
  item: PayableRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editAmount, setEditAmount] = useState(item.amount);
  const [editEntryDate, setEditEntryDate] = useState(item.entryDate ?? "");
  const [editDueDate, setEditDueDate] = useState(item.dueDate ?? "");
  const editDaysBetween = (() => {
    if (!editEntryDate || !editDueDate) return null;
    const from = new Date(editEntryDate + "T12:00:00");
    const to = new Date(editDueDate + "T12:00:00");
    const days = differenceInDays(to, from);
    return days >= 0 ? days : null;
  })();
  return (
    <ModalBackdrop onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          setError(null);
          setLoading(true);
          const res = await updatePayable(item.id, fd);
          setLoading(false);
          if (res?.success) onSuccess();
          else if (res?.error) setError(res.error);
        }}
        className="space-y-4"
      >
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Editar cuenta por pagar</h3>
        {error && <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">A quién le debemos *</label>
          <input name="creditorName" defaultValue={item.creditorName} required className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Monto total (CLP) *</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatThousands(editAmount)}
            onChange={(e) => setEditAmount(parseAmountInput(e.target.value))}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <input type="hidden" name="amount" value={editAmount || ""} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Fecha de ingreso</label>
          <DatePickerInput
            value={editEntryDate}
            onChange={setEditEntryDate}
            placeholder="dd/mm/aaaa"
            aria-label="Fecha de ingreso"
            className="w-full"
          />
          <input type="hidden" name="entryDate" value={editEntryDate} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Fecha de vencimiento</label>
          <DatePickerInput
            value={editDueDate}
            onChange={setEditDueDate}
            placeholder="dd/mm/aaaa"
            aria-label="Fecha de vencimiento"
            className="w-full"
          />
          <input type="hidden" name="dueDate" value={editDueDate} />
        </div>
        {editDaysBetween != null && (
          <p className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3 py-2 text-sm font-medium text-[var(--primary)]">
            Quedan <strong>{editDaysBetween}</strong> día{editDaysBetween !== 1 ? "s" : ""} entre ingreso y vencimiento.
          </p>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">N° factura</label>
          <input name="invoiceNumber" defaultValue={item.invoiceNumber ?? ""} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Notas</label>
          <textarea name="notes" rows={2} defaultValue={item.notes ?? ""} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium">Cancelar</button>
          <button type="submit" disabled={loading || editAmount < 1} className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">Guardar</button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

function PaymentModal({
  payable,
  onClose,
  onSuccess,
  initialAmount,
  initialDate,
  initialNotes,
  setAmount,
  setDate,
  setNotes,
}: {
  payable: PayableRow;
  onClose: () => void;
  onSuccess: () => void;
  initialAmount: string;
  initialDate: string;
  initialNotes: string;
  setAmount: (v: string) => void;
  setDate: (v: string) => void;
  setNotes: (v: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountNum = parseInt(initialAmount.replace(/\D/g, ""), 10) || 0;
  const exceedsPending = amountNum > 0 && amountNum > payable.pendingAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amountNum < 1) { setError("Indique el monto a pagar"); return; }
    if (amountNum > payable.pendingAmount) { setError(`El monto no puede superar el pendiente (${formatCLP(payable.pendingAmount)}).`); return; }
    setError(null);
    setLoading(true);
    const res = await addPayablePayment(payable.id, amountNum, new Date(initialDate + "T12:00:00"), initialNotes.trim() || null);
    setLoading(false);
    if (res?.success) onSuccess();
    else if (res?.error) setError(res.error);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Registrar pago</h3>
        <p className="text-sm text-[var(--muted)]">
          {payable.creditorName} — Pendiente: <strong>{formatCLP(payable.pendingAmount)}</strong>
        </p>
        {error && <p className="rounded-lg bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Monto a pagar (CLP) *</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatThousands(amountNum)}
            onChange={(e) => setAmount(String(parseAmountInput(e.target.value)))}
            placeholder={formatThousands(payable.pendingAmount)}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${exceedsPending ? "border-[var(--destructive)] bg-[var(--destructive)]/5 focus:ring-[var(--destructive)]" : "border-[var(--border)] bg-[var(--background)] focus:ring-[var(--primary)]"}`}
          />
          {exceedsPending && (
            <p className="mt-1.5 text-sm text-[var(--destructive)]">
              El monto no puede superar el pendiente ({formatCLP(payable.pendingAmount)}).
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Fecha del pago</label>
          <DatePickerInput
            value={initialDate}
            onChange={setDate}
            placeholder="dd/mm/aaaa"
            aria-label="Fecha del pago"
            className="w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Notas</label>
          <input type="text" value={initialNotes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium">Cancelar</button>
          <button type="submit" disabled={loading || amountNum < 1 || exceedsPending} className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? "Guardando…" : "Registrar pago"}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  );
}
