"use client";

import { useMemo, useState } from "react";
import type { SimulationDecision, SimulationEvent, SimulationExpense } from "@/types/curriculum";

type Student = { id: string; name: string };
type Phase = "name" | "intro" | "round" | "outcome" | "finished" | "submit_error";

/**
 * The whole game runs client-side in local state — there's no session to
 * persist per-round for an anonymous player, so nothing is written to the
 * database until the very end (one POST to /api/play/submit with the full
 * decisions_log). A student who closes the tab mid-game just loses that
 * attempt; re-visiting the link starts over.
 *
 * Event-per-round "cards" are the one place discrete cards are justified
 * in this app's design system — everywhere else uses ruled lists.
 */
export function SimulationGame({
  assignmentId,
  courseDisplayName,
  className,
  students,
  scenarioTitle,
  startingIncome,
  fixedExpenses,
  eventDeck,
}: {
  assignmentId: string;
  courseDisplayName: string;
  className: string;
  students: Student[];
  scenarioTitle: string;
  startingIncome: number;
  fixedExpenses: SimulationExpense[];
  eventDeck: SimulationEvent[];
}) {
  const [phase, setPhase] = useState<Phase>("name");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [balance, setBalance] = useState(0);
  const [decisions, setDecisions] = useState<SimulationDecision[]>([]);
  const [lastDecision, setLastDecision] = useState<SimulationDecision | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalExpenses = useMemo(
    () => fixedExpenses.reduce((sum, e) => sum + e.amount, 0),
    [fixedExpenses],
  );
  const netPerRound = startingIncome - totalExpenses;
  const currentEvent = eventDeck[roundIndex];

  function chooseOption(option: { label: string; impact: number }) {
    if (!currentEvent) return;
    const newBalance = balance + netPerRound + option.impact;
    const decision: SimulationDecision = {
      round: currentEvent.round,
      prompt: currentEvent.prompt,
      choice_label: option.label,
      impact: option.impact,
      balance_after: newBalance,
    };
    setBalance(newBalance);
    setDecisions((prev) => [...prev, decision]);
    setLastDecision(decision);
    setPhase("outcome");
  }

  async function advanceOrFinish() {
    if (roundIndex + 1 < eventDeck.length) {
      setRoundIndex((i) => i + 1);
      setPhase("round");
      return;
    }

    setPhase("finished");
    setSubmitting(true);
    try {
      const res = await fetch("/api/play/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          studentId,
          decisionsLog: decisions,
          endingNetWorth: balance,
        }),
      });
      if (!res.ok) setPhase("submit_error");
    } catch {
      setPhase("submit_error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <p className="text-center font-mono text-xs uppercase tracking-[0.18em] text-slate">
        {courseDisplayName} · {className}
      </p>
      <h1 className="mt-2 text-center font-display text-3xl font-semibold text-ink">
        {scenarioTitle}
      </h1>

      {phase === "name" && (
        <div className="mt-8">
          <p className="text-center text-sm text-slate">Who&apos;s playing?</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {students.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setStudentId(s.id);
                  setPhase("intro");
                }}
                className="border border-slate/40 bg-cream px-3 py-2.5 text-sm text-ink transition-colors hover:border-ink hover:bg-rose-gold/10"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "intro" && (
        <div className="mt-8 border border-rose-gold/40 p-6">
          <p className="font-mono text-xs uppercase tracking-wide text-slate">Your situation</p>
          <p className="mt-2 text-sm text-ink">
            Every round: <span className="font-semibold">+${startingIncome.toLocaleString()}</span>{" "}
            income, minus fixed expenses.
          </p>
          <div className="mt-3 space-y-1">
            {fixedExpenses.map((e) => (
              <div key={e.label} className="flex justify-between text-sm text-slate">
                <span>{e.label}</span>
                <span>${e.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-rose-gold/40 pt-3 text-sm font-semibold text-ink">
            Net per round: {netPerRound >= 0 ? "+" : ""}${netPerRound.toLocaleString()}
          </p>
          <p className="mt-4 text-sm text-slate">
            {eventDeck.length} rounds — each one, something happens and you decide how to handle
            it.
          </p>
          <button
            type="button"
            onClick={() => setPhase("round")}
            className="mt-5 w-full bg-ink px-4 py-2.5 text-sm font-medium text-cream transition-opacity hover:opacity-90"
          >
            Start
          </button>
        </div>
      )}

      {phase === "round" && currentEvent && (
        <div className="mt-8">
          <p className="text-center font-mono text-xs uppercase tracking-wide text-slate">
            Round {roundIndex + 1} of {eventDeck.length} · Balance ${balance.toLocaleString()}
          </p>
          <div className="mt-3 border border-rose-gold/40 bg-cream p-6">
            <p className="text-lg text-ink">{currentEvent.prompt}</p>
            <div className="mt-5 space-y-2">
              {currentEvent.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => chooseOption(option)}
                  className="w-full border border-ink px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-ink hover:text-cream"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === "outcome" && lastDecision && (
        <div className="mt-8 border border-gold-leaf/50 bg-gold-leaf/10 p-6 text-center">
          <p className="text-sm text-ink">You chose: {lastDecision.choice_label}</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink">
            {lastDecision.impact >= 0 ? "+" : ""}
            ${lastDecision.impact.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-slate">New balance: ${lastDecision.balance_after.toLocaleString()}</p>
          <button
            type="button"
            onClick={advanceOrFinish}
            className="mt-5 w-full bg-ink px-4 py-2.5 text-sm font-medium text-cream transition-opacity hover:opacity-90"
          >
            {roundIndex + 1 < eventDeck.length ? "Next round" : "Finish"}
          </button>
        </div>
      )}

      {phase === "finished" && (
        <div className="mt-8 text-center">
          <p className="font-mono text-xs uppercase tracking-wide text-slate">Final balance</p>
          <p className="mt-2 font-display text-5xl font-semibold text-ink">${balance.toLocaleString()}</p>
          <p className="mt-4 text-sm text-slate">
            {submitting ? "Saving your results…" : "Results saved — you can close this tab."}
          </p>
        </div>
      )}

      {phase === "submit_error" && (
        <div className="mt-8 text-center">
          <p className="font-mono text-xs uppercase tracking-wide text-slate">Final balance</p>
          <p className="mt-2 font-display text-5xl font-semibold text-ink">${balance.toLocaleString()}</p>
          <p className="mt-4 text-sm text-rose-gold">
            Couldn&apos;t save your results — check your connection and try again.
          </p>
          <button
            type="button"
            onClick={advanceOrFinish}
            className="mt-4 border border-ink px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-cream"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
