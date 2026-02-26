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

export type RegisterMovementState = { error?: string };

export async function registerMovement(
  productId: string,
  type: "entrada" | "salida",
  quantity: number,
  folio?: string
): Promise<RegisterMovementState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const establishmentId = session.user.establishmentId;
  const qty = Math.floor(Number(quantity));
  if (qty < 1) return { error: "La cantidad debe ser al menos 1" };

  const product = await prisma.inventoryProduct.findFirst({
    where: { id: productId, establishmentId },
    select: { id: true, stock: true },
  });
  if (!product) return { error: "Producto no encontrado" };

  if (type === "salida" && qty > product.stock) {
    return { error: "La cantidad no puede superar el stock actual" };
  }

  const movementType = type === "entrada" ? "ENTRY" : "EXIT";
  const folioTrim = folio?.trim() || undefined;

  await prisma.$transaction(async (tx) => {
    await tx.inventoryMovement.create({
      data: {
        productId: product.id,
        type: movementType,
        quantity: qty,
        folio: folioTrim,
      },
    });
    const newStock = type === "entrada" ? product.stock + qty : product.stock - qty;
    await tx.inventoryProduct.update({
      where: { id: product.id },
      data: { stock: Math.max(0, newStock) },
    });
  });

  revalidatePath("/dashboard/inventory");
  return {};
}
