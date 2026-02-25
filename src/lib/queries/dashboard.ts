import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, formatDistanceToNow, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { prisma } from "@/lib/db";

export async function getDashboardStats(establishmentId: string) {
  const now = new Date();
  const startMonth = startOfMonth(now);
  const endMonth = endOfMonth(now);
  const startPrevMonth = startOfMonth(subMonths(now, 1));
  const endPrevMonth = endOfMonth(subMonths(now, 1));
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const nextWeekEnd = endOfDay(addDays(now, 7));

  const [monthlyIncome, prevMonthlyIncome, paymentsToday, activeReservations, currentGuests, totalRooms, occupiedRooms, lowStockCount, pendingSum, invoiceCount, checkinsToday, checkoutsToday, availableRooms, upcomingReservations] = await Promise.all([
    prisma.payment.aggregate({
      where: { establishmentId, status: "COMPLETED", paidAt: { gte: startMonth, lte: endMonth } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { establishmentId, status: "COMPLETED", paidAt: { gte: startPrevMonth, lte: endPrevMonth } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { establishmentId, paidAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      _sum: { amount: true },
    }),
    prisma.reservation.count({
      where: { establishmentId, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
    }),
    prisma.reservation.count({
      where: { establishmentId, status: "CHECKED_IN" },
    }),
    prisma.room.count({ where: { establishmentId } }),
    prisma.room.count({ where: { establishmentId, status: "OCCUPIED" } }),
    prisma.inventoryProduct.findMany({ where: { establishmentId }, select: { stock: true, minStock: true } }).then((rows) => rows.filter((p) => p.stock < p.minStock).length),
    prisma.reservation.findMany({
      where: {
        establishmentId,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      },
      select: { id: true, totalAmount: true },
      take: 500,
    }).then(async (reservations) => {
      let total = 0;
      for (const r of reservations) {
        const sum = await prisma.payment.aggregate({
          where: { reservationId: r.id, status: "COMPLETED" },
          _sum: { amount: true },
        });
        const paid = sum._sum.amount ?? 0;
        if (paid < r.totalAmount) total += r.totalAmount - paid;
      }
      return total;
    }),
    prisma.invoice.count({
      where: { establishmentId, date: { gte: startMonth, lte: endMonth } },
    }),
    prisma.reservation.count({
      where: { establishmentId, checkIn: { gte: todayStart, lte: todayEnd }, status: { in: ["CONFIRMED", "PENDING"] } },
    }),
    prisma.reservation.count({
      where: { establishmentId, checkOut: { gte: todayStart, lte: todayEnd }, status: "CHECKED_IN" },
    }),
    prisma.room.count({ where: { establishmentId, status: "AVAILABLE" } }),
    prisma.reservation.count({
      where: { establishmentId, checkIn: { gt: now, lte: nextWeekEnd }, status: { in: ["CONFIRMED", "PENDING"] } },
    }),
  ]);

  const revenue = monthlyIncome._sum.amount ?? 0;
  const prevRevenue = prevMonthlyIncome._sum.amount ?? 0;
  const revenueTrend = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0;
  const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const prevOccupancy = totalRooms > 0 ? 0 : 0;
  const occupancyTrend = 0;

  return {
    revenue,
    revenueTrend,
    occupancy,
    occupancyTrend,
    reservations: activeReservations,
    guests: currentGuests,
    cobradoHoy: paymentsToday._sum.amount ?? 0,
    pagosPendientes: pendingSum,
    productosBajoStock: lowStockCount,
    boletasEsteMes: invoiceCount,
    totalRooms,
    occupiedRooms,
    checkinsToday,
    checkoutsToday,
    availableRooms,
    upcomingReservations,
  };
}

export async function getTodayPayments(establishmentId: string) {
  const start = startOfDay(new Date());
  const end = endOfDay(new Date());
  return prisma.payment.findMany({
    where: { establishmentId, paidAt: { gte: start, lte: end } },
    include: { reservation: { include: { guest: true, room: true } } },
    orderBy: { paidAt: "desc" },
    take: 10,
  });
}

export async function getPendingPaymentsPreview(establishmentId: string, limit = 5) {
  const reservations = await prisma.reservation.findMany({
    where: {
      establishmentId,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
    },
    include: { guest: true, room: true },
    take: 50,
  });
  const out: { type: "persona" | "empresa"; name: string; amount: number; room?: string }[] = [];
  for (const r of reservations) {
    const sum = await prisma.payment.aggregate({
      where: { reservationId: r.id, status: "COMPLETED" },
      _sum: { amount: true },
    });
    const paid = sum._sum.amount ?? 0;
    const pending = r.totalAmount - paid;
    if (pending <= 0) continue;
    if (r.companyName) {
      out.push({ type: "empresa", name: r.companyName, amount: pending });
    } else {
      out.push({ type: "persona", name: r.guest.fullName, amount: pending, room: r.room.roomNumber });
    }
    if (out.length >= limit) break;
  }
  return out;
}

export async function getLowStockProducts(establishmentId: string, limit = 10) {
  const products = await prisma.inventoryProduct.findMany({
    where: { establishmentId },
    select: { id: true, name: true, stock: true, minStock: true, unit: true },
  });
  return products.filter((p) => p.stock < p.minStock).slice(0, limit);
}

export async function getTodayCheckins(establishmentId: string) {
  const start = startOfDay(new Date());
  const end = endOfDay(new Date());
  const list = await prisma.reservation.findMany({
    where: {
      establishmentId,
      checkIn: { gte: start, lte: end },
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    include: { guest: true, room: true },
    orderBy: { checkIn: "asc" },
  });
  return list.map((r) => ({
    id: r.id,
    guest: r.guest.fullName,
    room: r.room.roomNumber,
    time: r.checkIn,
  }));
}

export async function getTodayCheckouts(establishmentId: string) {
  const start = startOfDay(new Date());
  const end = endOfDay(new Date());
  const list = await prisma.reservation.findMany({
    where: {
      establishmentId,
      checkOut: { gte: start, lte: end },
      status: { in: ["CHECKED_IN", "CHECKED_OUT"] },
    },
    include: { guest: true, room: true },
    orderBy: { checkOut: "asc" },
  });
  return list.map((r) => ({
    id: r.id,
    guest: r.guest.fullName,
    room: r.room.roomNumber,
    time: r.checkOut,
    status: r.status === "CHECKED_OUT" ? "Completado" : "Pendiente",
  }));
}

export async function getRecentActivity(establishmentId: string, limit = 5) {
  const logs = await prisma.activityLog.findMany({
    where: { establishmentId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { fullName: true } } },
  });
  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    user: log.user.fullName,
    time: formatDistanceToNow(log.createdAt, { addSuffix: true, locale: es }),
  }));
}
