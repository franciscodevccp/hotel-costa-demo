import { redirect } from "next/navigation";
import { getMockSessionServer } from "@/lib/mock-auth";
import { InventoryView } from "@/components/inventory/inventory-view";

export default async function InventoryPage() {
  const session = await getMockSessionServer();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <InventoryView />
    </div>
  );
}
