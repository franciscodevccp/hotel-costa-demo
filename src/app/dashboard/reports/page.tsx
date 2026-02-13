import { redirect } from "next/navigation";
import { getMockSessionServer } from "@/lib/mock-auth";
import { AdminReportsView } from "@/components/reports/admin-reports-view";

export default async function ReportsPage() {
  const session = await getMockSessionServer();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="p-6">
      <AdminReportsView />
    </div>
  );
}
