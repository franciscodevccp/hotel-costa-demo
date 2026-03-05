import { requireAuth } from "@/lib/require-auth";
import { getReportData } from "@/lib/queries/reports";
import { AdminReportsView } from "@/components/reports/admin-reports-view";

type SearchParams = Promise<{ year?: string; month?: string }> | { year?: string; month?: string };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireAuth(["ADMIN"]);
  const sp = searchParams ?? {};
  const params =
    typeof (sp as Promise<object>).then === "function"
      ? await (sp as Promise<{ year?: string; month?: string }>)
      : (sp as { year?: string; month?: string });
  const now = new Date();
  const yearNum = Math.min(2030, Math.max(2020, parseInt(params.year ?? String(now.getFullYear()), 10) || now.getFullYear()));
  const monthNum = Math.min(12, Math.max(1, parseInt(params.month ?? String(now.getMonth() + 1), 10) || now.getMonth() + 1));
  const periodDate = new Date(yearNum, monthNum - 1, 1);
  const data = await getReportData(session.user.establishmentId, periodDate);

  return (
    <div className="p-6">
      <AdminReportsView data={data} year={yearNum} month={monthNum} />
    </div>
  );
}
