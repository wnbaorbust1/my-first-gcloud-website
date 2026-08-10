import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center">
          <span className="font-display text-2xl font-semibold text-ink">
            Legacy Command Center
          </span>
        </Link>
        <div className="border border-rose-gold/40 bg-cream p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
