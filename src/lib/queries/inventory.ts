import { prisma } from "@/lib/db";

export async function getProducts(establishmentId: string) {
  return prisma.inventoryProduct.findMany({
    where: { establishmentId },
    select: {
      id: true,
      name: true,
      category: true,
      unit: true,
      stock: true,
      minStock: true,
    },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
  });
}
