import { Shell } from "@/components/layout/shell";

// Middleware already redirects unauthenticated requests away from
// everything under this group (see lib/supabase/middleware.ts's default-
// protected posture) — this layout just supplies the signed-in app chrome.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
