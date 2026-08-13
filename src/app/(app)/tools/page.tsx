import {
  Briefcase,
  CalendarClock,
  ClipboardList,
  Lock,
  Map as MapIcon,
  Megaphone,
  MessageSquare,
  Package,
  Users,
  Workflow,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getGatedBusinessContext } from "@/lib/billing/access-guard";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Advanced Tools — Blueprint" };
export const dynamic = "force-dynamic";

const TOOLS: Array<{ href: string; icon: LucideIcon; title: string; description: string }> = [
  {
    href: "/tools/crm",
    icon: Users,
    title: "CRM",
    description: "Track every lead from first contact through Won or Lost.",
  },
  {
    href: "/tools/journey",
    icon: MapIcon,
    title: "Customer Journey",
    description: "Map the path a customer takes with your business — fully customizable.",
  },
  {
    href: "/tools/sops",
    icon: ClipboardList,
    title: "SOP Builder",
    description: "Document how your business actually runs, step by step.",
  },
  {
    href: "/tools/automation",
    icon: Workflow,
    title: "Automation Mapper",
    description: "Map out what should happen automatically, in sequence.",
  },
  {
    href: "/tools/offers",
    icon: Package,
    title: "Offer Builder",
    description: "Build a clear offer — saves straight into My Blueprint.",
  },
  {
    href: "/tools/marketing-plan",
    icon: Megaphone,
    title: "Marketing Plan",
    description: "Turn how people find you into a written plan.",
  },
  {
    href: "/tools/scripts",
    icon: MessageSquare,
    title: "Sales Scripts",
    description: "Discovery calls, closing, objections — start from a template.",
  },
  {
    href: "/tools/content-planner",
    icon: CalendarClock,
    title: "Content Planner",
    description: "Daily, weekly, and monthly content ideas in one place.",
  },
];

export default async function ToolsPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="Advanced Tools unlock after your Blueprint Session"
        description="CRM, Journey, SOPs, Automation, Offers, Marketing, Scripts, and Content Planning — all use your real business data once Builder access is unlocked."
        action={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />
    );
  }
  if (access.locked) return <MembershipLockedNotice />;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-2 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-gold-600" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wide text-gold-700">
          Advanced Business Tools
        </span>
      </div>
      <h1 className="font-display text-3xl font-semibold text-navy-900">Tools</h1>
      <p className="mt-1 text-foreground-muted">
        Run {ub!.business.name} day-to-day with the same tools a real operator uses.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="h-full transition-colors hover:border-navy-300">
              <CardHeader className="flex-row items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600">
                  <tool.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <CardTitle className="text-base">{tool.title}</CardTitle>
              </CardHeader>
              <p className="text-sm text-foreground-muted">{tool.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
