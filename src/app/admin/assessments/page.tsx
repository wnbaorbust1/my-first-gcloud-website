import { Heart } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Manage Assessments — Blueprint Admin" };

export default function AdminAssessmentsPage() {
  return (
    <ComingSoon
      icon={Heart}
      title="Assessments"
      description="Managing assessment questions and scoring rules is coming in a future phase."
    />
  );
}
