import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Blueprint AI — Blueprint" };

export default function AiPage() {
  return (
    <ComingSoon
      icon={Sparkles}
      title="Blueprint AI"
      description="Your business-aware AI guide — built into Blueprint, not a generic chatbot — is coming in a future phase."
    />
  );
}
