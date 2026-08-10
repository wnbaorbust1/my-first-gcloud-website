import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in — Legacy Command Center" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-slate">Welcome back.</p>
      </div>

      {searchParams.error === "auth-callback-failed" && (
        <p role="alert" className="text-sm text-rose-gold">
          That link didn&apos;t work — it may have expired. Try again.
        </p>
      )}

      <LoginForm next={searchParams.next} />
    </div>
  );
}
