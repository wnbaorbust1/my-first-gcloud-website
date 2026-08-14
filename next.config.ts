import type { NextConfig } from "next";

/**
 * Security headers (Pre-Publish Audit follow-up — see docs/BUILD_STATUS.md).
 *
 * CSP is scoped to what this app actually loads: no external scripts, no
 * external fonts (next/font self-hosts Google fonts at build time), no
 * client-side Stripe.js (checkout is a server-created session the browser
 * is redirected to — a top-level navigation, which CSP doesn't restrict).
 * `style-src 'unsafe-inline'` is required because several components use
 * React's `style={{...}}` prop, which renders as inline `style` attributes.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
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
