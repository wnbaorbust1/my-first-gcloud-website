import { LibraryBig } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Manage Content — Blueprint Admin" };

export default function AdminContentPage() {
  return (
    <ComingSoon
      icon={LibraryBig}
      title="Content"
      description="Managing resources, task templates, and program content is coming in a future phase."
    />
  );
}
