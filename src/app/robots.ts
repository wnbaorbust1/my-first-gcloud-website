import type { MetadataRoute } from "next";

/**
 * Every authenticated surface (dashboard, tools, admin, facilitator,
 * organization, API routes) is behind auth anyway — this exists so a
 * crawler doesn't waste a budget trying, and so /reset-password (which
 * carries a one-time token in its query string) is never indexed.
 * Same `NEXTAUTH_URL` base-URL convention used for email links and
 * Stripe redirect URLs (see src/lib/billing/checkout.ts).
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/assessment",
        "/build",
        "/roadmap",
        "/my-blueprint",
        "/tools",
        "/money",
        "/goals",
        "/progress",
        "/sessions",
        "/business-profile",
        "/billing",
        "/settings",
        "/support",
        "/resources",
        "/organization",
        "/facilitator",
        "/admin",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
