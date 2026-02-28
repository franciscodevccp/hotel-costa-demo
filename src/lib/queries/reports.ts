import { startOfMonth, endOfMonth, subMonths, eachDayOfInterval, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";

export async function getReportData(establishmentId: string, month?: Date) {
  const now = month ?? new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const prevStart = startOfMonth(subMonths(now, 1));
  const prevEnd = endOfMonth(subMonths(now, 1));

  const paymentsInPeriod = await prisma.payment.findMany({
    where: {
      establishmentId,
      status: "COMPLETED",
      paidAt: { gte: start, lte: end },
    },
    select: { paidAt: true, amount: true, method: true, additionalMethods: true },
  });

  const byDay: Record<string, number> = {};
  const methodTotals: Record<string, number> = {};
  for (const p of paymentsInPeriod) {
    const date = p.paidAt.toISOString().slice(0, 10);
    byDay[date] = (byDay[date] ?? 0) + p.amount;
    const methods = Array.from(new Set([p.method, ...(p.additionalMethods ?? [])]));
    const share = p.amount / methods.length;
    for (const m of methods) {
      methodTotals[m] = (methodTotals[m] ?? 0) + share;
    }
  }

  const [reservationsByRoom, monthlyIncome, prevIncome, totalRooms, reservationsInPeriod, reservationsPrevMonth] = await Promise.all([
    prisma.reservation.groupBy({
      by: ["roomId"],
      where: {
        establishmentId,
        status: { not: "CANCELLED" },
        checkIn: { lte: end },
        checkOut: { gte: start },
      },
      _count: true,
    }).then(async (rows) => {
      const roomIds = rows.map((r) => r.roomId);
      const rooms = await prisma.room.findMany({
        where: { id: { in: roomIds } },
        select: { id: true, roomNumber: true },
      });
      const byNumber = Object.fromEntries(rooms.map((r) => [r.id, r.roomNumber]));
      return rows.map((r) => ({ roomNumber: byNumber[r.roomId] ?? r.roomId, count: r._count }));
    }),
    prisma.payment.aggregate({
      where: { establishmentId, status: "COMPLETED", paidAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { establishmentId, status: "COMPLETED", paidAt: { gte: prevStart, lte: prevEnd } },
      _sum: { amount: true },
    }),
    prisma.room.count({ where: { establishmentId } }),
    prisma.reservation.findMany({
      where: {
        establishmentId,
        status: { not: "CANCELLED" },
        checkIn: { lte: end },
        checkOut: { gte: start },
      },
      select: { roomId: true, checkIn: true, checkOut: true },
    }),
    prisma.reservation.findMany({
      where: {
        establishmentId,
        status: { not: "CANCELLED" },
        checkIn: { lte: prevEnd },
        checkOut: { gte: prevStart },
      },
      select: { roomId: true, checkIn: true, checkOut: true },
    }),
  ]);

  const dailyIncome = byDay;
  const paymentBreakdown = Object.entries(methodTotals)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));
  const topRooms = reservationsByRoom.sort((a, b) => b.count - a.count).slice(0, 10);

  const dailyOccupancy: Record<string, number> = {};
  let nightsSold = 0;
  const daysInMonth = eachDayOfInterval({ start, end });
  for (const day of daysInMonth) {
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const overlapping = reservationsInPeriod.filter(
      (r) => r.checkIn < dayEnd && r.checkOut > dayStart
    );
    const distinctRooms = new Set(overlapping.map((r) => r.roomId)).size;
    nightsSold += distinctRooms;
    const pct = totalRooms > 0 ? Math.round((distinctRooms / totalRooms) * 100) : 0;
    dailyOccupancy[day.toISOString().slice(0, 10)] = pct;
  }

  const prevDaysInMonth = eachDayOfInterval({ start: prevStart, end: prevEnd });
  let prevNightsSold = 0;
  let prevOcupacionSum = 0;
  for (const day of prevDaysInMonth) {
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const overlapping = reservationsPrevMonth.filter(
      (r) => r.checkIn < dayEnd && r.checkOut > dayStart
    );
    const distinctRooms = new Set(overlapping.map((r) => r.roomId)).size;
    prevNightsSold += distinctRooms;
    const pct = totalRooms > 0 ? Math.round((distinctRooms / totalRooms) * 100) : 0;
    prevOcupacionSum += pct;
  }
  const prevOcupacionPromedio =
    prevDaysInMonth.length > 0 ? Math.round(prevOcupacionSum / prevDaysInMonth.length) : 0;

  return {
    dailyIncome,
    dailyOccupancy,
    paymentBreakdown,
    topRooms,
    monthlyTotal: monthlyIncome._sum.amount ?? 0,
    prevMonthlyTotal: prevIncome._sum.amount ?? 0,
    nightsSold,
    prevNightsSold,
    prevOcupacionPromedio,
    reservationCount: reservationsInPeriod.length,
  };
}
