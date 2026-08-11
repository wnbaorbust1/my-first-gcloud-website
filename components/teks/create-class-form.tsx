"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClassAction } from "@/lib/teacher/roster-actions";
import type { Course } from "@/types/curriculum";

export function CreateClassForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId || !name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createClassAction({ courseId, name });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setName("");
      router.push(`/teks-mastery/${result.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label htmlFor="new-class-course" className="block text-sm font-medium text-ink">
          Course
        </label>
        <select
          id="new-class-course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.display_name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="new-class-name" className="block text-sm font-medium text-ink">
          Class name
        </label>
        <input
          id="new-class-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Period 3 Algebra I"
          className="border border-slate/40 bg-cream px-3 py-2 text-sm text-ink placeholder:text-slate/60"
        />
      </div>
      <button
        type="submit"
        disabled={pending || !courseId || !name.trim()}
        className="bg-ink px-4 py-2 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Creating…" : "+ New class"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-rose-gold">
          {error}
        </p>
      )}
    </form>
  );
}
