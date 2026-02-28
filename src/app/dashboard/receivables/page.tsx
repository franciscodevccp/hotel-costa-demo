import { format } from "date-fns";
import { requireAuth } from "@/lib/require-auth";
import { getReceivables } from "@/lib/queries/receivables";
import { ReceivablesView } from "@/components/receivables/receivables-view";
import type { ReceivableRow } from "@/components/receivables/receivables-view";

export default async function ReceivablesPage() {
  const session = await requireAuth(["ADMIN"]);
  const raw = await getReceivables(session.user.establishmentId);
  type RawItem = Awaited<ReturnType<typeof getReceivables>>[number];
  const receivables: ReceivableRow[] = raw.map((r: RawItem) => ({
    id: r.id,
    debtorName: r.debtorName,
    amount: r.amount,
    entryDate: r.entryDate ? format(r.entryDate, "yyyy-MM-dd") : null,
    dueDate: r.dueDate ? format(r.dueDate, "yyyy-MM-dd") : null,
    invoiceNumber: r.invoiceNumber ?? undefined,
    notes: r.notes ?? undefined,
    paidAmount: r.paidAmount,
    pendingAmount: r.pendingAmount,
    payments: r.payments.map((p: RawItem["payments"][number]) => ({
      id: p.id,
      amount: p.amount,
      paidAt: format(p.paidAt, "yyyy-MM-dd"),
      notes: p.notes ?? undefined,
    })),
  }));

  return (
    <div className="p-6">
      <ReceivablesView receivables={receivables} />
    </div>
  );
}
