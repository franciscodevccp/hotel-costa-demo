import { addDays, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";

export async function getPayables(establishmentId: string) {
  const list = await prisma.payable.findMany({
    where: { establishmentId },
    include: {
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
  return list.map((p) => {
    const paid = p.payments.reduce((s, x) => s + x.amount, 0);
    const pending = Math.max(0, p.amount - paid);
    let dueDate: Date | null = p.dueDate;
    if (p.paymentType === "RECURRING" && p.firstDueDate != null && (p.intervalDays ?? 0) > 0) {
      const lastPayment = p.payments[0];
      if (lastPayment) {
        dueDate = addDays(startOfDay(lastPayment.paidAt), p.intervalDays!);
      } else {
        dueDate = p.firstDueDate;
      }
    }
    return {
      id: p.id,
      creditorName: p.creditorName,
      amount: p.amount,
      paymentType: p.paymentType,
      entryDate: p.entryDate,
      dueDate,
      firstDueDate: p.firstDueDate,
      intervalDays: p.intervalDays,
      invoiceNumber: p.invoiceNumber,
      notes: p.notes,
      createdAt: p.createdAt,
      paidAmount: paid,
      pendingAmount: pending,
      payments: p.payments,
    };
  });
}

export async function getPayableById(establishmentId: string, id: string) {
  return prisma.payable.findFirst({
    where: { id, establishmentId },
    include: { payments: { orderBy: { paidAt: "desc" } } },
  });
}
