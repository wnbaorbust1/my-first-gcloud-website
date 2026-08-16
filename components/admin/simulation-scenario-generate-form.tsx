"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/auth/form-field";

export function SimulationScenarioGenerateForm({ courseId }: { courseId: string }) {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Enter a topic.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-simulation-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, topic, notes: notes.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed.");
        setLoading(false);
        return;
      }
      router.push(`/admin/simulations/${data.courseSlug}`);
    } catch {
      setError("Generation failed unexpectedly. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <FormField
        label="Scenario topic"
        name="topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        required
        placeholder="e.g. First apartment on a retail salary"
      />

      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Special notes <span className="font-normal text-slate">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60"
          placeholder="Anything the AI should account for — income level, number of rounds, specific life events to include, etc."
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-gold">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !topic.trim()}
        className="w-full bg-ink px-4 py-2.5 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Generating… this can take a minute" : "Generate scenario"}
      </button>
    </form>
  );
}
