import { Users } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Manage Users — Blueprint Admin" };

export default function AdminUsersPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Users"
      description="User management — roles, status, and organization membership — is coming in a future phase."
    />
  );
}
