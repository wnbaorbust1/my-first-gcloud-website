import type { NextConfig } from "next";

/**
 * Security headers (Pre-Publish Audit follow-up — see docs/BUILD_STATUS.md).
 *
 * Content-Security-Policy is deliberately NOT included here. It was added
 * and shipped, but only ever verified against `next dev` in this sandbox
 * (production `next build` fails here for an unrelated reason — a
 * turbopack Google-font fetch that doesn't work through this sandbox's
 * network proxy) — so it was never actually validated against the real
 * production JS bundle. It immediately correlated with reports of a blank
 * white page on navigation in production, which is a classic
 * hydration-blocked-by-CSP symptom. Pulled until it can be verified
 * against a real production build (or against a preview deployment)
 * before re-adding — a broken CSP that blocks login is worse than no CSP.
 *
 * The remaining headers below are safe: none of them can block script
 * execution or asset loading the way a misconfigured CSP can.
 */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
