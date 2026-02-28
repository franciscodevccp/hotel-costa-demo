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
    return {
      id: r.id,
      debtorName: r.debtorName,
      amount: r.amount,
      entryDate: r.entryDate,
      dueDate: r.dueDate,
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
