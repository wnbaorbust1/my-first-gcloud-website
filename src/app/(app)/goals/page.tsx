import { Target } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Goals — Blueprint" };

export default function GoalsPage() {
  return (
    <ComingSoon
      icon={Target}
      title="Goals"
      description="Set and track your 90-day goals here in a future phase."
    />
  );
}
