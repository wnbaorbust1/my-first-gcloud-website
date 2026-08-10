import { Hammer } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Build — Blueprint" };

export default function BuildPage() {
  return (
    <ComingSoon
      icon={Hammer}
      title="Business Builder"
      description="Interactive, workbook-style Builder activities for each stage of your Blueprint are coming in a future phase."
    />
  );
}
