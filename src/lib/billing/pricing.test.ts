import { describe, expect, it } from "vitest";

import {
  ANNUAL_PRICE_CENTS,
  ANNUAL_SAVINGS_CENTS,
  ANNUAL_SAVINGS_PERCENT,
  MONTHLY_PRICE_CENTS,
  TRIAL_DAYS,
} from "./pricing";

/** Regression coverage for the audit's spec-verbatim pricing check: $9.99/month, $100/year, 30-day trial. */
describe("Blueprint Builder pricing constants", () => {
  it("monthly price is exactly $9.99", () => {
    expect(MONTHLY_PRICE_CENTS).toBe(999);
  });

  it("annual price is exactly $100", () => {
    expect(ANNUAL_PRICE_CENTS).toBe(10000);
  });

  it("trial is exactly 30 days", () => {
    expect(TRIAL_DAYS).toBe(30);
  });

  it("annual savings are computed from the monthly price, not hardcoded", () => {
    expect(ANNUAL_SAVINGS_CENTS).toBe(MONTHLY_PRICE_CENTS * 12 - ANNUAL_PRICE_CENTS);
    expect(ANNUAL_SAVINGS_PERCENT).toBe(17);
  });
});
