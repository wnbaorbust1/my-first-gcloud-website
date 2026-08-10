import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Sessions — Blueprint" };

export default function SessionsPage() {
  return (
    <ComingSoon
      icon={CalendarDays}
      title="Sessions"
      description="Browse and register for facilitator-led Blueprint sessions here in a future phase."
    />
  );
}
