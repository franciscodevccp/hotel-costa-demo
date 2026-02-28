import { format } from "date-fns";
import { requireAuth } from "@/lib/require-auth";
import { getPayables } from "@/lib/queries/payables";
import { PayablesView } from "@/components/payables/payables-view";
import type { PayableRow } from "@/components/payables/payables-view";

export default async function PayablesPage() {
  const session = await requireAuth(["ADMIN"]);
  const raw = await getPayables(session.user.establishmentId);
  type RawItem = Awaited<ReturnType<typeof getPayables>>[number];
  const payables: PayableRow[] = raw.map((p: RawItem) => ({
    id: p.id,
    creditorName: p.creditorName,
    amount: p.amount,
    entryDate: p.entryDate ? format(p.entryDate, "yyyy-MM-dd") : null,
    dueDate: p.dueDate ? format(p.dueDate, "yyyy-MM-dd") : null,
    invoiceNumber: p.invoiceNumber ?? undefined,
    notes: p.notes ?? undefined,
    paidAmount: p.paidAmount,
    pendingAmount: p.pendingAmount,
    payments: p.payments.map((x: RawItem["payments"][number]) => ({
      id: x.id,
      amount: x.amount,
      paidAt: format(x.paidAt, "yyyy-MM-dd"),
      notes: x.notes ?? undefined,
    })),
  }));

  return (
    <div className="p-6">
      <PayablesView payables={payables} />
    </div>
  );
}
