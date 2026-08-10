import { Heart } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Blueprint Assessment — Blueprint" };

export default function AssessmentPage() {
  return (
    <ComingSoon
      icon={Heart}
      title="Blueprint Assessment"
      description="The full Passion → Power → Legacy assessment experience is being built in the next phase. This page is a placeholder so navigation and the dashboard CTA work end-to-end today."
    />
  );
}
