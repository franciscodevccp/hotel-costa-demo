import { format } from "date-fns";
import { requireAuth } from "@/lib/require-auth";
import { getInvoices, getProductsForInvoices } from "@/lib/queries/invoices";
import { InvoicesView } from "@/components/invoices/invoices-view";

export default async function InvoicesPage() {
  const session = await requireAuth();
  const [rawInvoices, products] = await Promise.all([
    getInvoices(session.user.establishmentId),
    getProductsForInvoices(session.user.establishmentId),
  ]);
  const invoices = rawInvoices.map((inv) => ({
    id: inv.id,
    folio: inv.folio,
    date: format(inv.date, "yyyy-MM-dd"),
    total: inv.total,
    type: (inv.type === "GUIA_DESPACHO" ? "guia_despacho" : inv.type === "COTIZACION" ? "cotizacion" : inv.type.toLowerCase()) as "boleta" | "factura" | "guia_despacho" | "cotizacion",
    photoUrls: inv.photoUrls,
    items: inv.items.map((i) => ({
      productId: i.productId,
      productName: i.product.name,
      quantity: i.quantity,
      unit: i.product.unit,
      unitPrice: i.unitPrice ?? 0,
    })),
    syncedWithInventory: inv.syncedInventory,
  }));

  return (
    <div className="p-6">
      <InvoicesView invoices={invoices} products={products} />
    </div>
  );
}
