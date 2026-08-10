import { TrendingUp } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Progress — Blueprint" };

export default function ProgressPage() {
  return (
    <ComingSoon
      icon={TrendingUp}
      title="Progress"
      description="A visual story of how far your business has come — tasks completed, systems built, milestones reached — is coming in a future phase."
    />
  );
}
