import { LibraryBig } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Resources — Blueprint" };

export default function ResourcesPage() {
  return (
    <ComingSoon
      icon={LibraryBig}
      title="Resources"
      description="A curated library of Blueprint resources, organized by stage, is coming in a future phase."
    />
  );
}
