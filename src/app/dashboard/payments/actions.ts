"use server";

import { revalidatePath } from "next/cache";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_STATUSES = ["PENDING", "PARTIAL", "COMPLETED", "REFUNDED"] as const;
const VALID_METHODS = ["CASH", "DEBIT", "CREDIT", "TRANSFER", "OTHER"] as const;
export type PaymentStatusValue = (typeof VALID_STATUSES)[number];
export type PaymentMethodValue = (typeof VALID_METHODS)[number];

export type UpdatePaymentStatusState = { error?: string; success?: boolean };
export type UpdatePaymentState = { error?: string; success?: boolean };

export type UpdatePaymentInput = {
  amount: number;
  method: PaymentMethodValue;
  status?: PaymentStatusValue;
};

/** Solo el administrador puede actualizar el estado de un pago (Pendiente, Pago de abono, Pago total). */
export async function updatePaymentStatus(
  paymentId: string,
  status: PaymentStatusValue
): Promise<UpdatePaymentStatusState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }
  if (session.user.role !== "ADMIN") {
    return { error: "Solo el administrador puede actualizar el estado del pago" };
  }
  if (!VALID_STATUSES.includes(status)) {
    return { error: "Estado no válido" };
  }

  try {
    const updated = await prisma.payment.updateMany({
      where: {
        id: paymentId,
        establishmentId: session.user.establishmentId,
      },
      data: { status },
    });
    if (updated.count === 0) {
      return { error: "Pago no encontrado" };
    }
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/pending-payments");
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar el estado";
    return { error: message };
  }
}

/** Admin y recepcionista pueden editar monto y estado del pago. */
export async function updatePayment(
  paymentId: string,
  input: UpdatePaymentInput
): Promise<UpdatePaymentState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }
  if (typeof input.amount !== "number" || input.amount < 0) {
    return { error: "Monto inválido" };
  }
  if (!VALID_METHODS.includes(input.method)) {
    return { error: "Método de pago no válido" };
  }
  if (input.status != null && !VALID_STATUSES.includes(input.status)) {
    return { error: "Estado no válido" };
  }

  try {
    const data: { amount: number; method: PaymentMethodValue; status?: PaymentStatusValue } = {
      amount: Math.round(input.amount),
      method: input.method,
    };
    if (input.status != null) data.status = input.status;

    const updated = await prisma.payment.updateMany({
      where: {
        id: paymentId,
        establishmentId: session.user.establishmentId,
      },
      data,
    });
    if (updated.count === 0) {
      return { error: "Pago no encontrado" };
    }
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/pending-payments");
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar el pago";
    return { error: message };
  }
}

export type CompletePaymentWithRestState = { error?: string; success?: boolean };

/**
 * Sumar un monto al mismo registro de pago (no crear otro).
 * - Si total pagado < total reserva: queda "Pago de abono" (PARTIAL) y pendiente = total reserva - total pagado.
 * - Si total pagado >= total reserva: queda "Pago total" (COMPLETED).
 * Si paga con otro método, se añade a additionalMethods (todos los métodos usados).
 */
export async function completePaymentWithRest(
  paymentId: string,
  additionalAmount: number,
  method: PaymentMethodValue,
  receiptUrl?: string | null,
  receiptHash?: string | null
): Promise<CompletePaymentWithRestState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }
  if (typeof additionalAmount !== "number" || additionalAmount <= 0) {
    return { error: "Monto inválido" };
  }
  if (!VALID_METHODS.includes(method)) {
    return { error: "Método de pago no válido" };
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        establishmentId: session.user.establishmentId,
      },
      include: { reservation: { select: { totalAmount: true } } },
    });
    if (!payment) {
      return { error: "Pago no encontrado" };
    }

    const totalAmount = payment.reservation.totalAmount;
    const newAmount = payment.amount + Math.round(additionalAmount);
    if (newAmount > totalAmount) {
      return { error: `El monto no puede superar el total de la reserva (${totalAmount} CLP)` };
    }
    // Si aún falta por pagar → Pago de abono (PARTIAL); si ya cubre todo → Pago total (COMPLETED)
    const newStatus = newAmount >= totalAmount ? PaymentStatus.COMPLETED : PaymentStatus.PARTIAL;

    const currentMethods = payment.additionalMethods ?? [];
    const isSameAsInitial = payment.method === method;
    const alreadyInList = currentMethods.includes(method);
    const newMethods: PaymentMethod[] =
      isSameAsInitial || alreadyInList ? [...currentMethods] : [...currentMethods, method];

    type ReceiptEntry = { url: string; amount: number; method: string; hash?: string };
    const paymentWithUrls = payment as typeof payment & { receiptUrls?: string[]; receiptEntries?: ReceiptEntry[] | null };
    const currentReceiptUrls =
      paymentWithUrls.receiptUrls?.length ? paymentWithUrls.receiptUrls : (payment.receiptUrl ? [payment.receiptUrl] : []);
    const newReceiptUrls = receiptUrl ? [...currentReceiptUrls, receiptUrl] : currentReceiptUrls;

    const currentEntries = (paymentWithUrls.receiptEntries ?? []) as ReceiptEntry[];
    if (receiptUrl && receiptHash) {
      const alreadyUsed = currentEntries.some((e) => e.hash === receiptHash);
      if (alreadyUsed) {
        return {
          error:
            "Esta imagen ya fue usada como comprobante en esta reserva. Suba una imagen diferente para este pago.",
        };
      }
    }
    const newEntries: ReceiptEntry[] = receiptUrl
      ? [...currentEntries, { url: receiptUrl, amount: Math.round(additionalAmount), method, hash: receiptHash ?? undefined }]
      : currentEntries;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        amount: newAmount,
        status: newStatus,
        additionalMethods: newMethods,
        receiptUrls: newReceiptUrls,
        ...(newEntries.length > 0 && { receiptEntries: newEntries as Parameters<typeof prisma.payment.update>[0]["data"] extends { receiptEntries?: infer J } ? J : never }),
      },
    });
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/pending-payments");
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al registrar el pago";
    return { error: message };
  }
}

export type RegisterFirstPaymentState = { error?: string; success?: boolean };

/** Registrar el primer pago de una reserva que aún no tiene ningún pago. */
export async function registerFirstPayment(
  reservationId: string,
  amount: number,
  method: PaymentMethodValue,
  receiptUrl?: string | null,
  receiptHash?: string | null
): Promise<RegisterFirstPaymentState> {
  const session = await auth();
  if (!session?.user?.establishmentId || !session.user?.id) {
    return { error: "No autorizado" };
  }
  if (typeof amount !== "number" || amount <= 0) {
    return { error: "Monto inválido" };
  }
  if (!VALID_METHODS.includes(method)) {
    return { error: "Método de pago no válido" };
  }

  try {
    const reservation = await prisma.reservation.findFirst({
      where: { id: reservationId, establishmentId: session.user.establishmentId },
      include: { payments: true },
    });
    if (!reservation) {
      return { error: "Reserva no encontrada" };
    }
    const existingSum = reservation.payments.reduce((s, p) => s + p.amount, 0);
    const totalAmount = reservation.totalAmount;
    if (amount > totalAmount) {
      return { error: `El monto no puede superar el total de la reserva (${totalAmount} CLP)` };
    }
    const status = amount >= totalAmount ? PaymentStatus.COMPLETED : PaymentStatus.PARTIAL;

    const receiptUrls = receiptUrl ? [receiptUrl] : [];
    const receiptEntries =
      receiptUrl
        ? [{ url: receiptUrl, amount: Math.round(amount), method, hash: receiptHash ?? undefined }]
        : undefined;
    await prisma.payment.create({
      data: {
        establishmentId: session.user.establishmentId,
        reservationId: reservation.id,
        registeredById: session.user.id,
        amount: Math.round(amount),
        method,
        status,
        notes: "Primer pago registrado desde Pagos",
        receiptUrl: receiptUrl ?? null,
        receiptUrls,
        ...(receiptEntries && { receiptEntries }),
      } as Parameters<typeof prisma.payment.create>[0]["data"],
    });
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/pending-payments");
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al registrar el pago";
    return { error: message };
  }
}

export type DeletePaymentState = { error?: string; success?: boolean };

/** Eliminar un registro de pago. Admin y recepcionista. */
export async function deletePayment(paymentId: string): Promise<DeletePaymentState> {
  const session = await auth();
  if (!session?.user?.establishmentId) {
    return { error: "No autorizado" };
  }

  try {
    const deleted = await prisma.payment.deleteMany({
      where: {
        id: paymentId,
        establishmentId: session.user.establishmentId,
      },
    });
    if (deleted.count === 0) {
      return { error: "Pago no encontrado" };
    }
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/pending-payments");
    revalidatePath("/dashboard/reservations");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al eliminar el pago";
    return { error: message };
  }
}
