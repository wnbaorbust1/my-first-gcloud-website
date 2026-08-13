"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "topic" | "spiral_review";

/** Quick-generate flow for one class — topic mode or spiral review (AI picks from recently-covered TEKS). Redirects straight to the display view on success, since this is meant for spontaneous, right-before-class use. */
export function BellRingerGenerateForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("topic");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "topic" && !topic.trim()) {
      setError("Enter a topic.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-bell-ringer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, mode, topic: mode === "topic" ? topic : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        setLoading(false);
        return;
      }
      router.push(`/bell-ringers/display/${data.bellRingerId}`);
    } catch {
      setError("Generation failed unexpectedly. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 border border-rose-gold/40 bg-cream p-4">
      <div className="flex gap-2">
        {(
          [
            { value: "topic", label: "Topic" },
            { value: "spiral_review", label: "Spiral review" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            className={
              option.value === mode
                ? "border border-ink bg-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-cream"
                : "border border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink hover:bg-ink/5"
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === "topic" ? (
        <div className="space-y-1.5">
          <label htmlFor="br-topic" className="block text-sm font-medium text-ink">
            Topic
          </label>
          <input
            id="br-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Order of operations warm-up"
            className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60"
          />
        </div>
      ) : (
        <p className="text-sm text-slate">
          The AI will pick one recently-covered standard from this class&apos;s TEKS mastery data
          and write a quick review.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-gold">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || (mode === "topic" && !topic.trim())}
        className="w-full bg-ink px-4 py-2.5 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Generating…" : "Generate bell ringer"}
      </button>
    </form>
  );
}
