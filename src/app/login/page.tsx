import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-lg">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-[var(--primary)]">
              Hotel de la Costa
            </h1>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
