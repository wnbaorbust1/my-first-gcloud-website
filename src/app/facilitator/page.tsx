import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Facilitator Dashboard — Blueprint" };

export default function FacilitatorDashboardPage() {
  return (
    <EmptyState
      icon={Users}
      title="See your participants"
      description="Assessment scores, session registrations, and attendance for everyone assigned to you or registered in a session you're facilitating."
      action={
        <Button asChild size="sm">
          <Link href="/facilitator/participants">View Participants</Link>
        </Button>
      }
    />
  );
}
