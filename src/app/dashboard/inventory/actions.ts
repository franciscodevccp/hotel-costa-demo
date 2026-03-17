"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type CreateProductState = { error?: string };

/** Crea un producto de inventario en la base de datos. */
export async function createProduct(
  name: string,
  category: string,
  stock: number,
  minStock: number,
  unit: string
): Promise<CreateProductState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const trimmedName = name?.trim() ?? "";
  if (!trimmedName) return { error: "El nombre del producto es obligatorio" };

  const establishmentId = session.user.establishmentId;
  const stockNum = Math.max(0, Math.floor(Number(stock)));
  const minStockNum = Math.max(0, Math.floor(Number(minStock)));
  const categoryTrim = (category?.trim() ?? "") || "Otros";
  const unitTrim = (unit?.trim() ?? "") || "unidad";

  const existing = await prisma.inventoryProduct.findFirst({
    where: { establishmentId, name: trimmedName },
  });
  if (existing) {
    return { error: "Ya existe un producto con ese nombre" };
  }

  await prisma.inventoryProduct.create({
    data: {
      establishmentId,
      name: trimmedName,
      category: categoryTrim,
      stock: stockNum,
      minStock: minStockNum,
      unit: unitTrim,
    },
  });

  revalidatePath("/dashboard/inventory");
  return {};
}

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

export type MovementDetail = {
  date: string;
  quantity: number;
  folio: string | null;
};

export async function getMovementsForProduct(productId: string): Promise<{
  entries: MovementDetail[];
  exits: MovementDetail[];
} | null> {
  const session = await auth();
  if (!session?.user?.establishmentId) return null;

  const product = await prisma.inventoryProduct.findFirst({
    where: { id: productId, establishmentId: session.user.establishmentId },
    select: { id: true },
  });
  if (!product) return null;

  const movements = await prisma.inventoryMovement.findMany({
    where: { productId: product.id },
    select: { type: true, quantity: true, folio: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const entries: MovementDetail[] = movements
    .filter((m) => m.type === "ENTRY")
    .map((m) => ({
      date: m.createdAt.toISOString().slice(0, 10),
      quantity: m.quantity,
      folio: m.folio ?? null,
    }));
  const exits: MovementDetail[] = movements
    .filter((m) => m.type === "EXIT")
    .map((m) => ({
      date: m.createdAt.toISOString().slice(0, 10),
      quantity: m.quantity,
      folio: m.folio ?? null,
    }));

  return { entries, exits };
}

export type UpdateStockState = { error?: string };

/** Actualiza el stock del producto directamente (ajuste manual). */
export async function updateProductStock(
  productId: string,
  stock: number
): Promise<UpdateStockState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const qty = Math.floor(Number(stock));
  if (qty < 0) return { error: "El stock no puede ser negativo" };

  const product = await prisma.inventoryProduct.findFirst({
    where: { id: productId, establishmentId: session.user.establishmentId },
    select: { id: true },
  });
  if (!product) return { error: "Producto no encontrado" };

  await prisma.inventoryProduct.update({
    where: { id: product.id },
    data: { stock: qty },
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

export type ResetEntryExitCountersState = { error?: string };

/** Borra todos los movimientos de inventario del establecimiento y limpia últ. entrada/salida. El stock de cada producto no se modifica; Entradas y Salidas pasan a 0. */
export async function resetEntryExitCounters(): Promise<ResetEntryExitCountersState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const establishmentId = session.user.establishmentId;
  const productIds = await prisma.inventoryProduct.findMany({
    where: { establishmentId },
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id));

  if (productIds.length === 0) {
    revalidatePath("/dashboard/inventory");
    return {};
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryMovement.deleteMany({ where: { productId: { in: productIds } } });
    await tx.inventoryProduct.updateMany({
      where: { id: { in: productIds } },
      data: { lastEntryAt: null, lastExitAt: null },
    });
  });

  revalidatePath("/dashboard/inventory");
  return {};
}
