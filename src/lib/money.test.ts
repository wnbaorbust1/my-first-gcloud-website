import { describe, expect, it } from "vitest";

import { formatCents } from "./money";

describe("formatCents", () => {
  it("formats whole dollars without trailing .00", () => {
    expect(formatCents(10000)).toBe("$100");
  });

  it("keeps cents when the amount isn't a whole dollar", () => {
    expect(formatCents(999)).toBe("$9.99");
  });

  it("handles zero", () => {
    expect(formatCents(0)).toBe("$0");
  });
});
