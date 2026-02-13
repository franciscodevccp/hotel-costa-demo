import { redirect } from "next/navigation";
import { getMockSessionServer } from "@/lib/mock-auth";
import { AdminPaymentsView } from "@/components/payments/admin-payments-view";
import { ReceptionistPaymentsView } from "@/components/payments/receptionist-payments-view";

export default async function PaymentsPage() {
  const session = await getMockSessionServer();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin" && session.role !== "receptionist") {
    redirect("/dashboard");
  }

  return (
    <div className="p-6">
      {session.role === "admin" && <AdminPaymentsView />}
      {session.role === "receptionist" && <ReceptionistPaymentsView />}
    </div>
  );
}
