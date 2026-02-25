import { prisma } from "@/lib/db";

export async function getPayments(establishmentId: string) {
  return prisma.payment.findMany({
    where: { establishmentId },
    include: {
      reservation: { include: { guest: true, room: true } },
      registeredBy: { select: { fullName: true } },
    },
    orderBy: { paidAt: "desc" },
    take: 100,
  });
}
