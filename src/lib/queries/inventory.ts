import { unstable_noStore } from "next/cache";
import { prisma } from "@/lib/db";

export async function getProducts(establishmentId: string) {
  unstable_noStore();
  const rows = await prisma.inventoryProduct.findMany({
    where: { establishmentId },
    select: {
      id: true,
      name: true,
      category: true,
      unit: true,
      stock: true,
      minStock: true,
      lastEntryAt: true,
      lastExitAt: true,
      movements: {
        select: { type: true, quantity: true, folio: true, createdAt: true },
        orderBy: { createdAt: "desc" as const },
      },
    },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
  });
  return rows.map((p) => {
    const entradas = p.movements
      .filter((m) => m.type === "ENTRY")
      .reduce((s, m) => s + m.quantity, 0);
    const salidas = p.movements
      .filter((m) => m.type === "EXIT")
      .reduce((s, m) => s + m.quantity, 0);
    const lastWithFolio = p.movements.find((m) => m.folio);
    const lastEntry = p.movements.find((m) => m.type === "ENTRY");
    const lastExit = p.movements.find((m) => m.type === "EXIT");
    const { movements: _, ...product } = p;
    return {
      ...product,
      entradas,
      salidas,
      folio: lastWithFolio?.folio ?? null,
      lastEntryAt: product.lastEntryAt ?? lastEntry?.createdAt ?? null,
      lastExitAt: product.lastExitAt ?? lastExit?.createdAt ?? null,
    };
  });
}
