import { BookOpen } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "My Blueprint — Blueprint" };

export default function MyBlueprintPage() {
  return (
    <ComingSoon
      icon={BookOpen}
      title="My Blueprint"
      description="Your beautifully organized business binder — Overview, Passion, Power, Legacy, and Documents — is coming in a future phase."
    />
  );
}
