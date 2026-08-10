import { Users } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Participants — Blueprint" };

export default function FacilitatorParticipantsPage() {
  return (
    <ComingSoon
      icon={Users}
      title="Participants"
      description="A roster of the businesses assigned to you, with notes and progress, is coming in a future phase."
    />
  );
}
