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

export type UpdateLastDatesState = { error?: string };

/** Actualiza manualmente la fecha de última entrada y/o última salida del producto (ej. según facturas). */
export async function updateProductLastDates(
  productId: string,
  data: { lastEntryAt?: string | null; lastExitAt?: string | null }
): Promise<UpdateLastDatesState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const product = await prisma.inventoryProduct.findFirst({
    where: { id: productId, establishmentId: session.user.establishmentId },
    select: { id: true },
  });
  if (!product) return { error: "Producto no encontrado" };

  const toDate = (s: string | null | undefined): Date | null => {
    if (s == null || s === "") return null;
    const d = new Date(s + "T12:00:00");
    return Number.isNaN(d.getTime()) ? null : d;
  };

  await prisma.inventoryProduct.update({
    where: { id: product.id },
    data: {
      ...(data.lastEntryAt !== undefined && { lastEntryAt: toDate(data.lastEntryAt) }),
      ...(data.lastExitAt !== undefined && { lastExitAt: toDate(data.lastExitAt) }),
    },
  });

  revalidatePath("/dashboard/inventory");
  return {};
}
