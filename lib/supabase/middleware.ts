import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

// Everything not listed here requires a signed-in session — new protected
// routes (dashboard sub-pages, curriculum, gradebook, etc.) don't need any
// middleware change, they're protected by default. Add a path here only
// when it's genuinely public.
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

// Signed-in users get bounced away from these two (no reason to see a
// login/signup form once authenticated). Deliberately excludes
// /forgot-password and /reset-password: the password-reset flow creates a
// real (temporary) session via the email link, and a signed-in user must
// still be able to reach /reset-password to set a new password.
const REDIRECT_IF_AUTHENTICATED = new Set(["/login", "/signup"]);

// The financial life simulation's student-facing play flow — there's no
// student-account system, so a student playing at /play/<joinCode> has no
// session at all. Both routes independently re-verify everything they
// need (join code validity, student-belongs-to-class) themselves rather
// than trusting a session, since there isn't one — see
// app/(fullscreen)/play/[joinCode]/page.tsx and
// app/api/play/submit/route.ts. This is the only public write surface in
// the app; keep it that narrow.
function isPlayPath(pathname: string) {
  return pathname.startsWith("/play/") || pathname.startsWith("/api/play/");
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/") || isPlayPath(pathname);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalidates the token against Supabase Auth on every
  // request — don't swap this for getSession(), which only reads the
  // cookie's claims without verifying them server-side.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && REDIRECT_IF_AUTHENTICATED.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
