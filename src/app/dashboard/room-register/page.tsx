import { requireAuth } from "@/lib/require-auth";
import { getRoomRegister } from "@/lib/queries/room-register";
import { RoomRegisterView } from "@/components/room-register/room-register-view";

function parseDateParam(param: string | undefined): Date {
  if (!param || typeof param !== "string") return new Date();
  const [y, m, d] = param.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default async function RoomRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const date = parseDateParam(params.date);
  const rows = await getRoomRegister(session.user.establishmentId, date);

  const dateStr =
    String(date.getFullYear()) +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0");

  return (
    <div className="p-6">
      <RoomRegisterView rows={rows} selectedDate={dateStr} />
    </div>
  );
}
