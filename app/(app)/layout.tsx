import { Shell } from "@/components/layout/shell";
import { getCurrentProfile } from "@/lib/auth/session";

// Middleware already redirects unauthenticated requests away from
// everything under this group (see lib/supabase/middleware.ts's default-
// protected posture) — this layout just supplies the signed-in app chrome.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  return <Shell isAdmin={profile?.role === "admin"}>{children}</Shell>;
}
