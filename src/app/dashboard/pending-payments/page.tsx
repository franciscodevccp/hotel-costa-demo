import { requireAuth } from "@/lib/require-auth";
import { getPendingCompanies, getPendingPersons } from "@/lib/queries/pending-payments";
import { PendingPaymentsView } from "@/components/pending-payments/pending-payments-view";

export default async function PendingPaymentsPage() {
  const session = await requireAuth();
  const [companies, persons] = await Promise.all([
    getPendingCompanies(session.user.establishmentId),
    getPendingPersons(session.user.establishmentId),
  ]);

  return (
    <div className="p-6">
      <PendingPaymentsView companies={companies} persons={persons} />
    </div>
  );
}
