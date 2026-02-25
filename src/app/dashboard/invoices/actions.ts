"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type CreateInvoiceState = { error?: string; success?: boolean };

export async function createInvoice(
  _prev: CreateInvoiceState,
  payload: {
    folio: string;
    type: "boleta" | "factura";
    date: string;
    total: number;
    photoUrls: string[];
    items: { productId: string; quantity: number; unitPrice: number }[];
  }
): Promise<CreateInvoiceState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const folio = payload.folio.trim().toUpperCase();
  if (!folio) return { error: "El folio es obligatorio" };

  const type = payload.type === "factura" ? "FACTURA" : "BOLETA";
  const date = new Date(payload.date);
  if (Number.isNaN(date.getTime())) return { error: "Fecha no válida" };

  const total = Math.max(0, Math.round(payload.total));
  const photoUrls = Array.isArray(payload.photoUrls) ? payload.photoUrls.slice(0, 5) : [];
  const items = Array.isArray(payload.items) ? payload.items : [];

  const existing = await prisma.invoice.findFirst({
    where: { establishmentId: session.user.establishmentId, folio },
  });
  if (existing) return { error: "Ya existe una boleta/factura con ese folio" };

  await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        establishmentId: session.user.establishmentId!,
        folio,
        type,
        date,
        total,
        photoUrls,
        syncedInventory: false,
      },
    });
    if (items.length > 0) {
      await tx.invoiceItem.createMany({
        data: items.map((i) => ({
          invoiceId: inv.id,
          productId: i.productId,
          quantity: Math.max(1, Math.round(i.quantity)),
          unitPrice: Math.max(0, Math.round(i.unitPrice)) || null,
        })),
      });
    }
  });

  revalidatePath("/dashboard/invoices");
  return { success: true };
}

export type SyncInvoiceState = { error?: string; success?: boolean };

export async function syncInvoiceWithInventory(
  _prev: SyncInvoiceState,
  invoiceId: string
): Promise<SyncInvoiceState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, establishmentId: session.user.establishmentId },
    include: { items: true },
  });
  if (!invoice) return { error: "Boleta/factura no encontrada" };
  if (invoice.syncedInventory) return { success: true };

  await prisma.$transaction(async (tx) => {
    for (const item of invoice.items) {
      await tx.inventoryMovement.create({
        data: {
          productId: item.productId,
          type: "ENTRY",
          quantity: item.quantity,
          folio: invoice.folio,
          note: `Ingreso por ${invoice.type} ${invoice.folio}`,
        },
      });
    }
    for (const item of invoice.items) {
      await tx.inventoryProduct.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { syncedInventory: true },
    });
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/inventory");
  return { success: true };
}
