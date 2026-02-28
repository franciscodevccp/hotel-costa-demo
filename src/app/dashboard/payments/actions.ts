"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_STATUSES = ["PENDING", "PARTIAL", "COMPLETED", "REFUNDED"] as const;
export type PaymentStatusValue = (typeof VALID_STATUSES)[number];

export type UpdatePaymentStatusState = { error?: string; success?: boolean };

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
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al actualizar el estado";
    return { error: message };
  }
}
