import { createAdminClient } from "@/lib/supabase/admin";
import { SimulationGame } from "@/components/simulation/simulation-game";
import type { SimulationEvent, SimulationExpense } from "@/types/curriculum";

/**
 * The one fully public page in this app — no session, no middleware
 * bypass needed beyond the PUBLIC_PATHS entry for /play/ (see
 * lib/supabase/middleware.ts). Reads with the service-role client
 * directly rather than the normal RLS-backed client: there's no student
 * session for RLS to check against, so this route IS the authorization
 * boundary (it only ever returns the minimal fields a player needs —
 * never anything from the teacher's own account).
 */
export default async function PlayPage({ params }: { params: { joinCode: string } }) {
  const admin = createAdminClient();

  const { data: assignment } = await admin
    .from("simulation_assignments")
    .select(
      "id, class:classes(name, students(id, name), course:courses(display_name)), scenario:simulation_scenarios(title, starting_income, fixed_expenses, event_deck)",
    )
    .eq("join_code", params.joinCode.toUpperCase())
    .maybeSingle();

  if (!assignment) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Not found</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
            That code doesn&apos;t match anything<span className="text-rose-gold">.</span>
          </h1>
          <p className="mt-2 text-sm text-slate">Double-check the code with your teacher.</p>
        </div>
      </div>
    );
  }

  const classInfo = assignment.class as unknown as {
    name: string;
    students: { id: string; name: string }[];
    course: { display_name: string };
  };
  const scenario = assignment.scenario as unknown as {
    title: string;
    starting_income: number;
    fixed_expenses: SimulationExpense[];
    event_deck: SimulationEvent[];
  };

  return (
    <SimulationGame
      assignmentId={assignment.id}
      courseDisplayName={classInfo.course.display_name}
      className={classInfo.name}
      students={classInfo.students}
      scenarioTitle={scenario.title}
      startingIncome={scenario.starting_income}
      fixedExpenses={scenario.fixed_expenses}
      eventDeck={[...scenario.event_deck].sort((a, b) => a.round - b.round)}
    />
  );
}
