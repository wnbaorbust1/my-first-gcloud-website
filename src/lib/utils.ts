import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving Tailwind conflicts sanely. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** A safe, lowercase-hyphenated filename fragment — e.g. for downloaded PDFs/PNGs (Phase 6: Downloads). */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "blueprint"
  );
}

/** The three Blueprint stages, in journey order. */
export const STAGES = ["PASSION", "POWER", "LEGACY"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_META: Record<
  Stage,
  { label: string; icon: string; color: string }
> = {
  PASSION: { label: "Passion", icon: "💗", color: "passion" },
  POWER: { label: "Power", icon: "⚡", color: "power" },
  LEGACY: { label: "Legacy", icon: "👑", color: "legacy" },
};
