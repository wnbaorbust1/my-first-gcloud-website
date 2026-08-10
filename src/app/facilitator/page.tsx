import { Users } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Facilitator Dashboard — Blueprint" };

export default function FacilitatorDashboardPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Facilitator Dashboard"
      description="Your assigned participants, their progress, and session rosters will appear here in a future phase."
    />
  );
}
