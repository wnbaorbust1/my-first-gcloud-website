import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Reset password — Legacy Command Center" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Reset your password</h1>
        <p className="mt-1 text-sm text-slate">
          Enter the email on your account and we&apos;ll send a link to reset it.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
