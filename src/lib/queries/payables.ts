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
    return {
      id: p.id,
      creditorName: p.creditorName,
      amount: p.amount,
      entryDate: p.entryDate,
      dueDate: p.dueDate,
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
