import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type AllowedRole = "ADMIN" | "RECEPTIONIST";

/**
 * Usar en Server Components y al inicio de Server Actions.
 * Si no hay sesión → redirect /login
 * Si allowedRoles está definido y el usuario no tiene uno de esos roles → redirect /dashboard
 */
export async function requireAuth(allowedRoles?: AllowedRole[]) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (allowedRoles?.length && !allowedRoles.includes(session.user.role))
    redirect("/dashboard");
  return session;
}
