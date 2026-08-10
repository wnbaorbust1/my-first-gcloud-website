import { LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Admin Overview — Blueprint" };

export default function AdminOverviewPage() {
  return (
    <ComingSoon
      icon={LayoutDashboard}
      title="Admin Overview"
      description="Platform-wide metrics and activity will appear here in a future phase."
    />
  );
}
