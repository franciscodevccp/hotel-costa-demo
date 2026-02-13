import { redirect } from "next/navigation";
import { getMockSessionServer } from "@/lib/mock-auth";
import { MOCK_ESTABLISHMENT, MOCK_WORKERS } from "@/lib/mock-data";
import { AdminSettingsView } from "@/components/settings/admin-settings-view";

export default async function SettingsPage() {
  const session = await getMockSessionServer();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="p-6">
      <AdminSettingsView establishment={MOCK_ESTABLISHMENT} workers={MOCK_WORKERS} />
    </div>
  );
}
