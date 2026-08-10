import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account — Legacy Command Center" };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-slate">Set up your teacher account.</p>
      </div>
      <SignupForm />
    </div>
  );
}
