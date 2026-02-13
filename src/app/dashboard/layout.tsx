import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { MockSession } from "@/lib/types/database";
import { DashboardShell } from "@/app/dashboard/dashboard-shell";

const COOKIE_NAME = "mock_session";

async function getMockSession(): Promise<MockSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(cookie) as MockSession;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getMockSession();

  if (!session) {
    redirect("/login");
  }

  const establishmentName = "Sede Central";

  return (
    <DashboardShell
      userName={session.full_name}
      userRole={session.role}
      establishmentName={establishmentName}
    >
      {children}
    </DashboardShell>
  );
}
