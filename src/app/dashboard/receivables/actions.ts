"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type CreateReceivableState = { error?: string; success?: boolean };

export async function createReceivable(
  _prev: CreateReceivableState,
  formData: FormData
): Promise<CreateReceivableState> {
  const session = await auth();
  if (!session?.user?.establishmentId || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const debtorName = formData.get("debtorName")?.toString()?.trim();
  const amountStr = formData.get("amount")?.toString();
  const entryDateStr = formData.get("entryDate")?.toString() || null;
  const dueDateStr = formData.get("dueDate")?.toString() || null;
  const invoiceNumber = formData.get("invoiceNumber")?.toString()?.trim() || null;
  const notes = formData.get("notes")?.toString()?.trim() || null;

  if (!debtorName) return { error: "Indique quién nos debe (acreedor)" };
  const amount = amountStr ? parseInt(amountStr.replace(/\D/g, ""), 10) : 0;
  if (Number.isNaN(amount) || amount < 1) return { error: "Monto debe ser mayor a 0" };

  const parseDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    const dte = new Date(y, m - 1, d);
    return Number.isNaN(dte.getTime()) ? null : dte;
  };
  const entryDate = entryDateStr ? parseDate(entryDateStr) : null;
  const dueDate = dueDateStr ? parseDate(dueDateStr) : null;

  try {
    await prisma.receivable.create({
      data: {
        establishmentId: session.user.establishmentId,
        debtorName,
        amount,
        entryDate,
        dueDate,
        invoiceNumber,
        notes,
      },
    });
    revalidatePath("/dashboard/receivables");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear la cuenta por cobrar";
    return { error: message };
  }
}

export type UpdateReceivableState = { error?: string; success?: boolean };

export async function updateReceivable(
  id: string,
  formData: FormData
): Promise<UpdateReceivableState> {
  const session = await auth();
  if (!session?.user?.establishmentId || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const debtorName = formData.get("debtorName")?.toString()?.trim();
  const amountStr = formData.get("amount")?.toString();
  const entryDateStr = formData.get("entryDate")?.toString() || null;
  const dueDateStr = formData.get("dueDate")?.toString() || null;
  const invoiceNumber = formData.get("invoiceNumber")?.toString()?.trim() || null;
  const notes = formData.get("notes")?.toString()?.trim() || null;

  if (!debtorName) return { error: "Indique quién nos debe (acreedor)" };
  const amount = amountStr ? parseInt(amountStr.replace(/\D/g, ""), 10) : 0;
  if (Number.isNaN(amount) || amount < 1) return { error: "Monto debe ser mayor a 0" };

  const parseDate = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    const dte = new Date(y, m - 1, d);
    return Number.isNaN(dte.getTime()) ? null : dte;
  };
  const entryDate = entryDateStr ? parseDate(entryDateStr) : null;
  const dueDate = dueDateStr ? parseDate(dueDateStr) : null;

  try {
    const updated = await prisma.receivable.updateMany({
      where: { id, establishmentId: session.user.establishmentId },
      data: { debtorName, amount, entryDate, dueDate, invoiceNumber, notes },
    });
    if (updated.count === 0) return { error: "Cuenta por cobrar no encontrada" };
    revalidatePath("/dashboard/receivables");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar";
    return { error: message };
  }
}

export type DeleteReceivableState = { error?: string; success?: boolean };

export async function deleteReceivable(id: string): Promise<DeleteReceivableState> {
  const session = await auth();
  if (!session?.user?.establishmentId || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }
  try {
    const deleted = await prisma.receivable.deleteMany({
      where: { id, establishmentId: session.user.establishmentId },
    });
    if (deleted.count === 0) return { error: "Cuenta por cobrar no encontrada" };
    revalidatePath("/dashboard/receivables");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar";
    return { error: message };
  }
}

export type AddReceivablePaymentState = { error?: string; success?: boolean };

export async function addReceivablePayment(
  receivableId: string,
  amount: number,
  paidAt: Date,
  notes?: string | null
): Promise<AddReceivablePaymentState> {
  const session = await auth();
  if (!session?.user?.establishmentId || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }
  if (amount < 1) return { error: "Monto debe ser mayor a 0" };

  try {
    const rec = await prisma.receivable.findFirst({
      where: { id: receivableId, establishmentId: session.user.establishmentId },
      include: { payments: true },
    });
    if (!rec) return { error: "Cuenta por cobrar no encontrada" };
    const paidSoFar = rec.payments.reduce((s, p) => s + p.amount, 0);
    const pending = rec.amount - paidSoFar;
    if (amount > pending) return { error: `El monto no puede superar el saldo pendiente (${pending.toLocaleString("es-CL")} CLP)` };

    await prisma.receivablePayment.create({
      data: { receivableId, amount, paidAt, notes: notes || null },
    });
    revalidatePath("/dashboard/receivables");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al registrar el cobro";
    return { error: message };
  }
}
