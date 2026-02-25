import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { prisma } from "@/lib/db";

export async function getReportData(establishmentId: string, month?: Date) {
  const now = month ?? new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const prevStart = startOfMonth(subMonths(now, 1));
  const prevEnd = endOfMonth(subMonths(now, 1));

  const [paymentsRaw, paymentsByMethod, reservationsByRoom, monthlyIncome, prevIncome] = await Promise.all([
    prisma.payment.findMany({
      where: {
        establishmentId,
        status: "COMPLETED",
        paidAt: { gte: start, lte: end },
      },
      select: { paidAt: true, amount: true },
    }).then((rows) => {
      const byDay: Record<string, number> = {};
      for (const r of rows) {
        const date = r.paidAt.toISOString().slice(0, 10);
        byDay[date] = (byDay[date] ?? 0) + r.amount;
      }
      return byDay;
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: {
        establishmentId,
        status: "COMPLETED",
        paidAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
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
  ]);

  const dailyIncome = paymentsRaw;
  const paymentBreakdown = paymentsByMethod.map((r) => ({
    name: r.method,
    value: r._sum.amount ?? 0,
  }));
  const topRooms = reservationsByRoom.sort((a, b) => b.count - a.count).slice(0, 10);

  return {
    dailyIncome,
    paymentBreakdown,
    topRooms,
    monthlyTotal: monthlyIncome._sum.amount ?? 0,
    prevMonthlyTotal: prevIncome._sum.amount ?? 0,
  };
}
