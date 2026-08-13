import type { Stage } from "@/lib/utils";

/**
 * The canonical My Blueprint layout (spec Prompt 6 MY BLUEPRINT section
 * list, verbatim, in order) — the single source of truth for what
 * sections exist, independent of which Builder tasks happen to populate
 * them. A business always sees every one of these, populated or not.
 *
 * Two spec titles — "Products" and "Services" — are combined into one
 * section, "Products & Services": Phase 5's task library defines them as
 * a single Builder task ("Finalize Products and Services") because they're
 * one cohesive offer definition for a small business, not two independent
 * documents. Keeping them as two separately-editable sections bound to the
 * same underlying data would let them silently overwrite each other, so
 * they're presented as one section instead. This mirrors the existing,
 * already-documented decision to leave "Technology" (Power) and "Impact"
 * (Legacy) as honest empty states — no task in the library populates them
 * yet, and nothing here fabricates content to fill the gap.
 */
export const BLUEPRINT_SECTIONS: Record<Stage, string[]> = {
  PASSION: [
    "Business Overview",
    "Purpose",
    "Mission",
    "Vision",
    "Ideal Customer",
    "Customer Pain Points",
    "Elevator Pitch",
    "Value Proposition",
    "Business Goals",
  ],
  POWER: [
    "Products & Services",
    "Pricing",
    "Marketing",
    "Lead Generation",
    "Sales Process",
    "Follow-Up",
    "Customer Journey",
    "CRM",
    "Operations",
    "SOPs",
    "Technology",
    "Automation",
    "Revenue Goals",
  ],
  LEGACY: [
    "Scaling Strategy",
    "Team",
    "Delegation",
    "Hiring",
    "Recurring Revenue",
    "Intellectual Property",
    "Partnerships",
    "Succession",
    "Impact",
    "Legacy Plan",
  ],
};

/** Flat lookup: section title -> stage, for validating an edit request. */
export const SECTION_STAGE: Record<string, Stage> = Object.fromEntries(
  (Object.entries(BLUEPRINT_SECTIONS) as [Stage, string[]][]).flatMap(([stage, titles]) =>
    titles.map((title) => [title, stage]),
  ),
);

export const ALL_SECTION_TITLES = Object.keys(SECTION_STAGE);
