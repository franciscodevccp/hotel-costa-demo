import { prisma } from "@/lib/db";

export async function getEstablishment(establishmentId: string) {
  return prisma.establishment.findUnique({
    where: { id: establishmentId },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      logoUrl: true,
      totalRooms: true,
    },
  });
}

export async function getWorkers(establishmentId: string) {
  return prisma.user.findMany({
    where: { establishmentId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
    },
    orderBy: { fullName: "asc" },
  });
}
