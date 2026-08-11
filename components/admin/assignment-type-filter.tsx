"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ASSIGNMENT_TYPES, ASSIGNMENT_TYPE_LABELS } from "@/lib/curriculum/constants";

/** Type filter for the assignment list view — drives the ?type= query param. */
export function AssignmentTypeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") ?? "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("type", value);
    } else {
      params.delete("type");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="type-filter" className="font-mono text-xs uppercase tracking-wide text-slate">
        Filter by type
      </label>
      <select
        id="type-filter"
        value={currentType}
        onChange={(e) => handleChange(e.target.value)}
        className="border border-slate/40 bg-cream px-2 py-1.5 text-sm text-ink"
      >
        <option value="">All types</option>
        {ASSIGNMENT_TYPES.map((type) => (
          <option key={type} value={type}>
            {ASSIGNMENT_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
    </div>
  );
}
