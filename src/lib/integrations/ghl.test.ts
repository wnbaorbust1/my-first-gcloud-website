import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GHL LEAD WORKFLOW — unit coverage for the one property that matters
 * most: notifyGhl() must never throw, no matter what GHL_WEBHOOK_URL
 * points at or how the fetch to it fails. A signup or an assessment
 * completion can never be taken down by a bad workflow URL, a GHL
 * outage, or a missing env var.
 */
const logErrorMock = vi.fn(async () => {});
vi.mock("@/lib/observability/log-error", () => ({ logError: logErrorMock }));

const { notifyGhl } = await import("./ghl");

describe("notifyGhl", () => {
  const originalUrl = process.env.GHL_WEBHOOK_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    logErrorMock.mockClear();
  });

  afterEach(() => {
    process.env.GHL_WEBHOOK_URL = originalUrl;
    global.fetch = originalFetch;
  });

  const payload = {
    event: "signup" as const,
    email: "lead@example.com",
    firstName: "Test",
    lastName: "Lead",
    businessName: null,
    stage: null,
    healthScorePercent: null,
  };

  it("is a no-op when GHL_WEBHOOK_URL is unset", async () => {
    delete process.env.GHL_WEBHOOK_URL;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    await expect(notifyGhl(payload)).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts the payload to the configured webhook URL", async () => {
    process.env.GHL_WEBHOOK_URL = "https://example.test/hooks/abc";
    const fetchSpy = vi.fn(async (_url: string, _init: RequestInit) => new Response(null, { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;

    await notifyGhl(payload);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://example.test/hooks/abc");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ ...payload, source: "blueprint_app" });
    expect(logErrorMock).not.toHaveBeenCalled();
  });

  it("logs and never throws on a non-2xx response", async () => {
    process.env.GHL_WEBHOOK_URL = "https://example.test/hooks/abc";
    global.fetch = vi.fn(async () => new Response(null, { status: 500 })) as unknown as typeof fetch;

    await expect(notifyGhl(payload)).resolves.toBeUndefined();
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });

  it("logs and never throws when fetch itself rejects", async () => {
    process.env.GHL_WEBHOOK_URL = "https://example.test/hooks/abc";
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    await expect(notifyGhl(payload)).resolves.toBeUndefined();
    expect(logErrorMock).toHaveBeenCalledTimes(1);
  });
});
