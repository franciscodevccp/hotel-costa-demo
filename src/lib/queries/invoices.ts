import { prisma } from "@/lib/db";

export async function getInvoices(establishmentId: string) {
  return prisma.invoice.findMany({
    where: { establishmentId },
    include: {
      supplier: true,
      items: { include: { product: true } },
    },
    orderBy: { date: "desc" },
    take: 100,
  });
}

export async function getProductsForInvoices(establishmentId: string) {
  return prisma.inventoryProduct.findMany({
    where: { establishmentId },
    select: { id: true, name: true, category: true, unit: true },
    orderBy: { name: "asc" },
  });
}
