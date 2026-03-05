import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/types/database";
import { requireAuth } from "@/lib/require-auth";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const establishment = await prisma.establishment.findUnique({
    where: { id: session.user.establishmentId },
    select: { name: true },
  });
  const establishmentName = establishment?.name ?? "Hotel";

  const userRole: UserRole = session.user.role === "ADMIN" ? "admin" : "receptionist";

  return (
    <DashboardShell
      userName={session.user.name}
      userRole={userRole}
      establishmentName={establishmentName}
    >
      {children}
    </DashboardShell>
  );
}
