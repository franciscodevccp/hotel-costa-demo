import { addDays, isWeekend, startOfDay } from "date-fns";
import { prisma } from "@/lib/db";

function addBusinessDays(from: Date, days: number): Date {
  let d = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    d = addDays(d, 1);
    if (!isWeekend(d)) remaining--;
  }
  return d;
}

function businessDaysBetween(from: Date, to: Date): number {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (end.getTime() <= start.getTime()) return 0;
  let count = 0;
  let d = new Date(start);
  while (d.getTime() < end.getTime()) {
    d = addDays(d, 1);
    if (!isWeekend(d)) count++;
  }
  return count;
}

/** Solo empresas con orden de compra (paymentTermDays > 0) aparecen aquí. */
export async function getPendingCompanies(establishmentId: string) {
  const reservations = await prisma.reservation.findMany({
    where: {
      establishmentId,
      companyName: { not: null },
      paymentTermDays: { not: null, gt: 0 },
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
    },
    include: { guest: true, room: true },
  });
  const today = startOfDay(new Date());
  const out: Array<{
    id: string;
    companyName: string;
    companyRut: string | null;
    companyEmail: string | null;
    guestName: string;
    roomNumber: string;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    paymentTermDays: number | null;
    due_date: Date;
    business_days_remaining: number;
  }> = [];
  for (const r of reservations) {
    const sum = await prisma.payment.aggregate({
      where: { reservationId: r.id },
      _sum: { amount: true },
    });
    const paid = sum._sum.amount ?? 0;
    const pending = r.totalAmount - paid;
    if (pending <= 0) continue;
    const due_date =
      r.paymentTermDays != null && r.paymentTermDays > 0
        ? addBusinessDays(r.checkOut, r.paymentTermDays)
        : r.checkOut;
    const business_days_remaining = businessDaysBetween(today, due_date);
    out.push({
      id: r.id,
      companyName: r.companyName!,
      companyRut: r.companyRut,
      companyEmail: r.companyEmail,
      guestName: r.guest.fullName,
      roomNumber: r.room.roomNumber,
      totalAmount: r.totalAmount,
      paidAmount: paid,
      pendingAmount: pending,
      paymentTermDays: r.paymentTermDays,
      due_date,
      business_days_remaining,
    });
  }
  return out;
}

/** Personas y empresas sin orden de compra: todas las reservas con saldo pendiente que no entran en "empresas con días hábiles". */
export async function getPendingPersons(establishmentId: string) {
  const reservations = await prisma.reservation.findMany({
    where: {
      establishmentId,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      OR: [
        { companyName: null },
        { companyName: { not: null }, OR: [{ paymentTermDays: null }, { paymentTermDays: 0 }] },
      ],
    },
    include: { guest: true, room: true },
  });
  const out: Array<{
    id: string;
    guestName: string;
    roomNumber: string;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    guestPhone: string | null;
    checkOut: Date;
    companyName: string | null;
  }> = [];
  for (const r of reservations) {
    const sum = await prisma.payment.aggregate({
      where: { reservationId: r.id },
      _sum: { amount: true },
    });
    const paid = sum._sum.amount ?? 0;
    const pending = r.totalAmount - paid;
    if (pending <= 0) continue;
    out.push({
      id: r.id,
      guestName: r.guest.fullName,
      roomNumber: r.room.roomNumber,
      totalAmount: r.totalAmount,
      paidAmount: paid,
      pendingAmount: pending,
      guestPhone: r.guest.phone,
      checkOut: r.checkOut,
      companyName: r.companyName,
    });
  }
  return out;
}

/** Todas las reservas con saldo pendiente (personas + empresas) para la página de Pagos. totalAmount es el de la reserva (personalizado o predeterminado). */
export async function getAllPendingReservations(establishmentId: string) {
  const [persons, companies] = await Promise.all([
    getPendingPersons(establishmentId),
    getPendingCompanies(establishmentId),
  ]);
  const personRows = persons.map((p) => ({
    reservationId: p.id,
    guestName: p.guestName,
    roomNumber: p.roomNumber,
    totalAmount: p.totalAmount,
    paidAmount: p.paidAmount,
    pendingAmount: p.pendingAmount,
  }));
  const companyRows = companies.map((c) => ({
    reservationId: c.id,
    guestName: c.guestName,
    roomNumber: c.roomNumber,
    totalAmount: c.totalAmount,
    paidAmount: c.paidAmount,
    pendingAmount: c.pendingAmount,
  }));
  return [...personRows, ...companyRows];
}
