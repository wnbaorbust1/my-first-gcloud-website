import { Compass } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "My Roadmap — Blueprint" };

export default function RoadmapPage() {
  return (
    <ComingSoon
      icon={Compass}
      title="My Roadmap"
      description="Your personalized, stage-by-stage roadmap will appear here once your Blueprint Assessment is complete."
    />
  );
}
