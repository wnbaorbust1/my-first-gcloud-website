import Link from "next/link";

/**
 * Ledger-styled locked state shown in place of gated content (lesson
 * detail, gradebook) instead of a raw 404 or blank page — the gold-leaf
 * stamp motif standing in for a padlock rather than a generic banner.
 */
export function Paywall({
  courseName,
  message,
}: {
  courseName: string;
  message?: string;
}) {
  return (
    <div className="mx-auto max-w-md border border-rose-gold/40 p-8 text-center">
      <span
        aria-hidden="true"
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-gold-leaf text-gold-leaf"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="7" width="10" height="6" rx="1" />
          <path d="M5 7V5a3 3 0 0 1 6 0v2" strokeLinecap="round" />
        </svg>
      </span>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-wide text-slate">Locked</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink">{courseName}</h2>
      <p className="mt-2 text-sm text-slate">
        {message ?? "Subscribe to unlock this course's lessons, gradebook, and AI-generated content."}
      </p>
      <Link
        href="/pricing"
        className="mt-5 inline-block bg-ink px-4 py-2.5 text-sm font-medium text-cream transition-opacity hover:opacity-90"
      >
        View plans
      </Link>
    </div>
  );
}
