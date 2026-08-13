"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Thin client boundary around next-auth's SessionProvider so the server
 * root layout can stay a server component. Any component in the tree can
 * call `useSession()` after this.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
