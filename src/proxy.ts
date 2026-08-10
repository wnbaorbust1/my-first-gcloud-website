import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { hasAnyRole, ROUTE_GROUP_ROLES } from "@/lib/rbac";

// Every authenticated area of the app. Kept as one matcher so a new member
// page just needs a route added here — auth is enforced centrally instead
// of per-page.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/roadmap/:path*",
    "/build/:path*",
    "/ai/:path*",
    "/my-blueprint/:path*",
    "/goals/:path*",
    "/money/:path*",
    "/tools/:path*",
    "/resources/:path*",
    "/sessions/:path*",
    "/progress/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/assessment/:path*",
    "/business-profile/:path*",
    "/facilitator/:path*",
    "/admin/:path*",
  ],
};

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const matchedGroup = ROUTE_GROUP_ROLES.find(({ prefix }) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (matchedGroup && !hasAnyRole(token.role, matchedGroup.roles)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}
