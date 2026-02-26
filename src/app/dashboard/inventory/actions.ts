"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type DeleteProductState = { error?: string };

export async function deleteProduct(productId: string): Promise<DeleteProductState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const establishmentId = session.user.establishmentId;

  const product = await prisma.inventoryProduct.findFirst({
    where: { id: productId, establishmentId },
  });
  if (!product) {
    return { error: "Producto no encontrado" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryMovement.deleteMany({ where: { productId } });
    await tx.invoiceItem.deleteMany({ where: { productId } });
    await tx.inventoryProduct.delete({ where: { id: productId } });
  });

  revalidatePath("/dashboard/inventory");
  return {};
}
