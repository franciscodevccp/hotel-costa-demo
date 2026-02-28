import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, formatDistanceToNow } from "date-fns";
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
  const [monthlyIncome, prevMonthlyIncome, paymentsToday, activeReservations, currentGuests, totalRooms, occupiedRooms, lowStockCount, pendingSum, invoiceCount, checkinsToday, checkoutsToday] = await Promise.all([
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
    prisma.reservation
      .findMany({
        where: {
          establishmentId,
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
          checkIn: { lte: todayEnd },
          checkOut: { gt: todayStart },
        },
        select: { roomId: true },
      })
      .then((rows) => new Set(rows.map((r) => r.roomId)).size),
    prisma.inventoryProduct.findMany({ where: { establishmentId }, select: { stock: true, minStock: true } }).then((rows) => rows.filter((p) => p.stock < p.minStock).length),
    prisma.reservation.findMany({
      where: {
        establishmentId,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
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
      where: { establishmentId, checkIn: { gte: todayStart, lte: todayEnd }, status: "CHECKED_IN" },
    }),
    prisma.reservation.count({
      where: {
        establishmentId,
        status: "CHECKED_OUT",
        OR: [
          { checkedOutAt: { gte: todayStart, lte: todayEnd } },
          { checkedOutAt: null, checkOut: { gte: todayStart, lte: todayEnd } },
        ],
      },
    }),
  ]);

  const revenue = monthlyIncome._sum.amount ?? 0;
  const prevRevenue = prevMonthlyIncome._sum.amount ?? 0;
  const revenueTrend = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0;
  const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const prevOccupancy = totalRooms > 0 ? 0 : 0;
  const occupancyTrend = 0;

  const availableRooms = totalRooms - occupiedRooms;

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
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
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

/** Check-ins de hoy = reservas ya marcadas como "Check-in realizado" en gestión cuya fecha de entrada es hoy. La hora mostrada es cuando se hizo clic en check-in (checkedInAt). */
export async function getTodayCheckins(establishmentId: string) {
  const start = startOfDay(new Date());
  const end = endOfDay(new Date());
  const list = await prisma.reservation.findMany({
    where: {
      establishmentId,
      checkIn: { gte: start, lte: end },
      status: "CHECKED_IN",
    },
    include: { guest: true, room: true },
    orderBy: { checkIn: "asc" },
  });
  return list.map((r) => {
    const res = r as typeof r & { checkedInAt?: Date | null };
    return {
      id: r.id,
      guest: r.guest.fullName,
      room: r.room.roomNumber,
      time: res.checkedInAt ?? r.checkIn,
    };
  });
}

/** Check-outs de hoy = reservas marcadas como "Check-out realizado" cuyo checkedOutAt es hoy, o (sin checkedOutAt) con fecha de salida hoy. La hora mostrada es cuando se hizo clic (checkedOutAt). */
export async function getTodayCheckouts(establishmentId: string) {
  const start = startOfDay(new Date());
  const end = endOfDay(new Date());
  const list = await prisma.reservation.findMany({
    where: {
      establishmentId,
      status: "CHECKED_OUT",
      OR: [
        { checkedOutAt: { gte: start, lte: end } },
        { checkedOutAt: null, checkOut: { gte: start, lte: end } },
      ],
    },
    include: { guest: true, room: true },
    orderBy: { checkOut: "asc" },
  });
  return list.map((r) => {
    const res = r as typeof r & { checkedOutAt?: Date | null };
    return {
      id: r.id,
      guest: r.guest.fullName,
      room: r.room.roomNumber,
      time: res.checkedOutAt ?? r.checkOut,
      status: "Completado" as const,
    };
  });
}


