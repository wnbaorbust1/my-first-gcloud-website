import { TrendingUp } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/shared/coming-soon";

export const metadata: Metadata = { title: "Analytics — Blueprint Admin" };

export default function AdminAnalyticsPage() {
  return (
    <ComingSoon
      icon={TrendingUp}
      title="Analytics"
      description="Platform-wide analytics and reporting are coming in a future phase."
    />
  );
}
