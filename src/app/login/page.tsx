import Image from "next/image";
import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5efe6] px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-[0_4px_24px_rgba(44,24,16,0.08)]">
        <div className="space-y-8">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/logo/Logo-Hotel-La-Costa.webp"
              alt="Hotel de la Costa"
              width={160}
              height={80}
              className="h-16 w-auto object-contain"
              priority
            />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--primary)]">
              Hotel de la Costa
            </h1>
            <div className="mx-auto mt-2 h-0.5 w-12 rounded-full bg-[var(--accent-coffee)]" aria-hidden />
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
