import {
  Award,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Heart,
  ListChecks,
  Map as MapIcon,
  Rocket,
  Users,
} from "lucide-react";
import type { Metadata } from "next";

import { MetricCard } from "@/components/ui/metric-card";
import { getAdminDashboardMetrics } from "@/lib/admin/metrics";

export const metadata: Metadata = { title: "Admin Overview — Blueprint" };
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const m = await getAdminDashboardMetrics();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Admin Overview</h1>
        <p className="text-sm text-foreground-muted">
          Platform-wide, live from the database — nothing here is a placeholder.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-400">
          Growth
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="Users" value={m.userCount} icon={Users} />
          <MetricCard label="Assessments Started" value={m.assessmentsStarted} icon={ClipboardCheck} />
          <MetricCard label="Assessments Completed" value={m.assessmentsCompleted} icon={CheckCircle2} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-400">
          Sessions &amp; Builder
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="Session Registrations" value={m.sessionRegistrations} icon={CalendarDays} />
          <MetricCard label="Session Attendance" value={m.sessionAttendance} icon={CalendarCheck} />
          <MetricCard label="Builder Activations" value={m.builderActivations} icon={Rocket} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-400">
          Membership
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="Active Members" value={m.activeMembers} icon={CreditCard} accent="gold" />
          <MetricCard label="Monthly Members" value={m.monthlyMembers} icon={CreditCard} />
          <MetricCard label="Annual Members" value={m.annualMembers} icon={CreditCard} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-400">
          Engagement
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MetricCard
            label="Task Completion"
            value={m.taskCompletionPercent !== null ? `${m.taskCompletionPercent}%` : "—"}
            helpText={`${m.taskCompleted} of ${m.taskTotal} roadmap tasks completed platform-wide`}
            icon={ListChecks}
          />
          <MetricCard
            label="Roadmap Progress"
            value={m.avgRoadmapProgress !== null ? `${m.avgRoadmapProgress}%` : "—"}
            helpText="Average completion across businesses with an active roadmap"
            icon={MapIcon}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-400">
          Average Scores (latest assessment per business)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <MetricCard
            label="Passion Average"
            value={m.stageAverages.PASSION !== null ? `${m.stageAverages.PASSION}%` : "—"}
            icon={Heart}
            accent="passion"
          />
          <MetricCard
            label="Power Average"
            value={m.stageAverages.POWER !== null ? `${m.stageAverages.POWER}%` : "—"}
            icon={Award}
            accent="power"
          />
          <MetricCard
            label="Legacy Average"
            value={m.stageAverages.LEGACY !== null ? `${m.stageAverages.LEGACY}%` : "—"}
            icon={Award}
            accent="legacy"
          />
          <MetricCard
            label="Business Health Average"
            value={m.avgHealth !== null ? `${m.avgHealth}%` : "—"}
            icon={Heart}
            accent="gold"
          />
        </div>
      </section>
    </div>
  );
}
