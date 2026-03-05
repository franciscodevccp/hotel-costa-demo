import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "ADMIN" | "RECEPTIONIST";
      establishmentId: string;
    };
  }
}

type JWTWithRole = { role?: "ADMIN" | "RECEPTIONIST"; establishmentId?: string };

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  trustHost: true, // necesario detrás de Nginx u otro reverse proxy
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || typeof credentials.password !== "string")
          return null;
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).toLowerCase().trim() },
          select: {
            id: true,
            fullName: true,
            email: true,
            passwordHash: true,
            role: true,
            establishmentId: true,
            isActive: true,
          },
        });
        if (!user || !user.isActive) return null;
        const ok = await compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          establishmentId: user.establishmentId,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user && "role" in user && "establishmentId" in user) {
        token.sub = user.id;
        token.role = user.role;
        token.establishmentId = user.establishmentId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        const t = token as { sub?: string } & JWTWithRole;
        session.user.id = t.sub ?? "";
        session.user.role = t.role ?? "RECEPTIONIST";
        session.user.establishmentId = t.establishmentId ?? "";
      }
      return session;
    },
  },
});
