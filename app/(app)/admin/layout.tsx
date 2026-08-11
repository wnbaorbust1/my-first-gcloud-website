import { requireAdmin } from "@/lib/auth/session";
import { AdminTabs } from "@/components/admin/admin-tabs";

/**
 * Everything under /admin is content-authoring tooling — curriculum
 * (lessons) and assignments, each generated, edited, and published the
 * same way. requireAdmin() is defense-in-depth here (RLS is the real
 * boundary on every write these pages trigger); this just keeps a
 * non-admin from ever seeing the admin UI at all, same posture as the
 * rest of the app's layout guards.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div>
      <AdminTabs />
      {children}
    </div>
  );
}
