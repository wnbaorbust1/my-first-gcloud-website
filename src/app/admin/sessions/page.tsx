import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Manage Sessions — Blueprint Admin" };

export default function AdminSessionsPage() {
  return (
    <ComingSoon
      icon={CalendarDays}
      title="Sessions"
      description="Creating and managing session offerings is coming in a future phase."
    />
  );
}
