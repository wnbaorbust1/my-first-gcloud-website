/** Shared cents -> "$X.XX" (or "$X" when whole) formatter, used by billing and the Prompt 9 Money tools alike. */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}
