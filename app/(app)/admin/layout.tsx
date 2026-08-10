import { requireAdmin } from "@/lib/auth/session";

/**
 * Everything under /admin is curriculum-authoring tooling — generation,
 * editing, publishing. requireAdmin() is defense-in-depth here (RLS is the
 * real boundary on every write these pages trigger); this just keeps a
 * non-admin from ever seeing the admin UI at all, same posture as the rest
 * of the app's layout guards.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div>
      <p className="mb-6 border-b border-rose-gold/40 pb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-rose-gold">
        Admin — Curriculum Authoring
      </p>
      {children}
    </div>
  );
}
