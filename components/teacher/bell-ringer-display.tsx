"use client";

import { useState } from "react";
import Link from "next/link";

/** Full-screen, large-text presentation view — answer key stays hidden until the teacher reveals it, so it's safe to have this up while students are still working. */
export function BellRingerDisplay({
  title,
  promptText,
  answerKey,
  courseDisplayName,
}: {
  title: string;
  promptText: string;
  answerKey: string;
  courseDisplayName: string;
}) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center sm:px-16">
      <Link
        href="/bell-ringers"
        className="fixed left-4 top-4 font-mono text-xs uppercase tracking-wide text-slate hover:text-ink"
      >
        ← Exit
      </Link>

      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">
        {courseDisplayName} · Bell Ringer
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
      <p className="mx-auto mt-8 max-w-3xl whitespace-pre-wrap font-display text-3xl leading-snug text-ink sm:text-5xl">
        {promptText}
      </p>

      <div className="mt-12">
        {showAnswer ? (
          <div className="mx-auto max-w-2xl border border-gold-leaf/50 bg-gold-leaf/10 px-6 py-4 text-left">
            <p className="font-mono text-xs uppercase tracking-wide text-slate">Answer key</p>
            <p className="mt-2 whitespace-pre-wrap text-base text-ink">{answerKey}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAnswer(true)}
            className="border border-ink px-5 py-2.5 font-mono text-xs uppercase tracking-wide text-ink transition-colors hover:bg-ink hover:text-cream"
          >
            Show answer key
          </button>
        )}
      </div>
    </div>
  );
}
