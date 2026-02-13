import { redirect } from "next/navigation";
import { getMockSessionServer } from "@/lib/mock-auth";
import { InvoicesView } from "@/components/invoices/invoices-view";

export default async function InvoicesPage() {
  const session = await getMockSessionServer();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <InvoicesView />
    </div>
  );
}
