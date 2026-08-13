import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-navy-900">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="mb-8 font-display text-2xl font-semibold tracking-tight text-cream-50"
        >
          Blueprint
        </Link>
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-8 shadow-xl shadow-navy-900/30">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-navy-300">
          From Passion to Power to Legacy™
        </p>
      </div>
    </div>
  );
}
