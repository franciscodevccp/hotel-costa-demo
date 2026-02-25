import { requireAuth } from "@/lib/require-auth";
import { getReportData } from "@/lib/queries/reports";
import { AdminReportsView } from "@/components/reports/admin-reports-view";

export default async function ReportsPage() {
  const session = await requireAuth(["ADMIN"]);
  const data = await getReportData(session.user.establishmentId);

  return (
    <div className="p-6">
      <AdminReportsView data={data} />
    </div>
  );
}
