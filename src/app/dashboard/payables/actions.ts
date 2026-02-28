"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type CreatePayableState = { error?: string; success?: boolean };

export async function createPayable(
  _prev: CreatePayableState,
  formData: FormData
): Promise<CreatePayableState> {
  const session = await auth();
  if (!session?.user?.establishmentId || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const creditorName = formData.get("creditorName")?.toString()?.trim();
  const amountStr = formData.get("amount")?.toString();
  const entryDateStr = formData.get("entryDate")?.toString() || null;
  const dueDateStr = formData.get("dueDate")?.toString() || null;
  const invoiceNumber = formData.get("invoiceNumber")?.toString()?.trim() || null;
  const notes = formData.get("notes")?.toString()?.trim() || null;

  if (!creditorName) return { error: "Indique a quién le debemos (proveedor/acreedor)" };
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
    await prisma.payable.create({
      data: {
        establishmentId: session.user.establishmentId,
        creditorName,
        amount,
        entryDate,
        dueDate,
        invoiceNumber,
        notes,
      },
    });
    revalidatePath("/dashboard/payables");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear la cuenta por pagar";
    return { error: message };
  }
}

export type UpdatePayableState = { error?: string; success?: boolean };

export async function updatePayable(
  id: string,
  formData: FormData
): Promise<UpdatePayableState> {
  const session = await auth();
  if (!session?.user?.establishmentId || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }

  const creditorName = formData.get("creditorName")?.toString()?.trim();
  const amountStr = formData.get("amount")?.toString();
  const entryDateStr = formData.get("entryDate")?.toString() || null;
  const dueDateStr = formData.get("dueDate")?.toString() || null;
  const invoiceNumber = formData.get("invoiceNumber")?.toString()?.trim() || null;
  const notes = formData.get("notes")?.toString()?.trim() || null;

  if (!creditorName) return { error: "Indique a quién le debemos (proveedor/acreedor)" };
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
    const updated = await prisma.payable.updateMany({
      where: { id, establishmentId: session.user.establishmentId },
      data: { creditorName, amount, entryDate, dueDate, invoiceNumber, notes },
    });
    if (updated.count === 0) return { error: "Cuenta por pagar no encontrada" };
    revalidatePath("/dashboard/payables");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar";
    return { error: message };
  }
}

export type DeletePayableState = { error?: string; success?: boolean };

export async function deletePayable(id: string): Promise<DeletePayableState> {
  const session = await auth();
  if (!session?.user?.establishmentId || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }
  try {
    const deleted = await prisma.payable.deleteMany({
      where: { id, establishmentId: session.user.establishmentId },
    });
    if (deleted.count === 0) return { error: "Cuenta por pagar no encontrada" };
    revalidatePath("/dashboard/payables");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar";
    return { error: message };
  }
}

export type AddPayablePaymentState = { error?: string; success?: boolean };

export async function addPayablePayment(
  payableId: string,
  amount: number,
  paidAt: Date,
  notes?: string | null
): Promise<AddPayablePaymentState> {
  const session = await auth();
  if (!session?.user?.establishmentId || session.user.role !== "ADMIN") {
    return { error: "No autorizado" };
  }
  if (amount < 1) return { error: "Monto debe ser mayor a 0" };

  try {
    const pay = await prisma.payable.findFirst({
      where: { id: payableId, establishmentId: session.user.establishmentId },
      include: { payments: true },
    });
    if (!pay) return { error: "Cuenta por pagar no encontrada" };
    const paidSoFar = pay.payments.reduce((s, p) => s + p.amount, 0);
    const pending = pay.amount - paidSoFar;
    if (amount > pending) return { error: `El monto no puede superar el saldo pendiente (${pending.toLocaleString("es-CL")} CLP)` };

    await prisma.payablePayment.create({
      data: { payableId, amount, paidAt, notes: notes || null },
    });
    revalidatePath("/dashboard/payables");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al registrar el pago";
    return { error: message };
  }
}
