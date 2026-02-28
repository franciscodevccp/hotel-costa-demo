import { prisma } from "@/lib/db";

export async function getGuests(establishmentId: string) {
  return prisma.guest.findMany({
    where: { establishmentId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      rut: true,
      type: true,
      companyName: true,
      companyRut: true,
      companyEmail: true,
      emergencyContact: true,
      nationality: true,
      notes: true,
      isBlacklisted: true,
      blockReason: true,
      createdAt: true,
    },
    orderBy: { fullName: "asc" },
    take: 200,
  });
}
