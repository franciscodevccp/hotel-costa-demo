import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";

export async function getReceivables(establishmentId: string) {
  const list = await prisma.receivable.findMany({
    where: { establishmentId },
    include: {
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
  return list.map((r) => {
    const paid = r.payments.reduce((s, p) => s + p.amount, 0);
    const pending = Math.max(0, r.amount - paid);
    let dueDate: Date | null = r.dueDate;
    if (r.paymentType === "RECURRING" && r.firstDueDate != null && (r.intervalDays ?? 0) > 0) {
      const lastPayment = r.payments[0];
      if (lastPayment) {
        dueDate = addDays(startOfDay(lastPayment.paidAt), r.intervalDays!);
      } else {
        dueDate = r.firstDueDate;
      }
    }
    return {
      id: r.id,
      debtorName: r.debtorName,
      amount: r.amount,
      paymentType: r.paymentType,
      entryDate: r.entryDate,
      dueDate,
      firstDueDate: r.firstDueDate,
      intervalDays: r.intervalDays,
      invoiceNumber: r.invoiceNumber,
      notes: r.notes,
      createdAt: r.createdAt,
      paidAmount: paid,
      pendingAmount: pending,
      payments: r.payments,
    };
  });
}

export async function getReceivableById(establishmentId: string, id: string) {
  return prisma.receivable.findFirst({
    where: { id, establishmentId },
    include: { payments: { orderBy: { paidAt: "desc" } } },
  });
}
