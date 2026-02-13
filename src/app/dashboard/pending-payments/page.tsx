import { redirect } from "next/navigation";
import { getMockSessionServer } from "@/lib/mock-auth";
import { PendingPaymentsView } from "@/components/pending-payments/pending-payments-view";

export default async function PendingPaymentsPage() {
  const session = await getMockSessionServer();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin" && session.role !== "receptionist") {
    redirect("/dashboard");
  }

  return (
    <div className="p-6">
      <PendingPaymentsView />
    </div>
  );
}
