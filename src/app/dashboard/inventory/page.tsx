import { requireAuth } from "@/lib/require-auth";
import { getProducts } from "@/lib/queries/inventory";
import { InventoryView } from "@/components/inventory/inventory-view";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await requireAuth();
  const products = await getProducts(session.user.establishmentId);

  return (
    <div className="p-6">
      <InventoryView products={products} />
    </div>
  );
}
