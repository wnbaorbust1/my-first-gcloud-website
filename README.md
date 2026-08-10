# Legacy Command Center for Teachers

A subscription curriculum platform for high school teachers — AI-generated,
TEKS-aligned lesson plans, assignments, assessments, a gradebook, TEKS
mastery tracking, student portfolios, a prep checklist, a bell ringer
generator, a financial life simulation, a presentation builder, calendar
sync, and Stripe-gated access across 8 subjects (Money Matters, Dollars &
Sense, Algebra I, Biology, English I, US History, Accounting I, Accounting
II).

This is a from-scratch rebuild, being built in phases.

- **Phase 1** (done): project scaffold, design system, folder structure, Supabase client wiring.
- **Phase 2** (done): authentication and the core database schema — see below.
- Curriculum, gradebook, portfolios, billing, etc. land in later phases.

## Tech stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** — Postgres + Auth + Storage + Row-Level Security
- **Tailwind CSS**
- **Stripe** for subscription billing
- Deployed on **Vercel**

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real Supabase/Stripe keys
npm run dev
```

Open http://localhost:3000.

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Design system

Brand tokens live as CSS variables in `app/globals.css` and are mapped into
`tailwind.config.ts`.

| Token | Value | Tailwind class |
|---|---|---|
| `--ink` | `#2B2420` | `text-ink`, `bg-ink`, `border-ink` |
| `--cream` | `#FAF7F0` | `text-cream`, `bg-cream`, `border-cream` |
| `--rose-gold` | `#B76E79` | `text-rose-gold`, `bg-rose-gold`, `border-rose-gold` |
| `--gold-leaf` | `#C9A24B` | `text-gold-leaf`, `bg-gold-leaf`, `border-gold-leaf` |
| `--slate` | `#6B6459` | `text-slate`, `bg-slate`, `border-slate` |

All five support Tailwind opacity modifiers (`border-rose-gold/40`) — they're
stored as `"R G B"` channel triples and wrapped with `rgb(var(...) /
<alpha-value>)` in the Tailwind config, not as hex strings.

Each of the 8 courses gets **one unique accent hue**, used only for that
course's small tag/icon — never a full background. See
`components/ui/course-tag.tsx` and the `--accent-*` variables in
`globals.css` (placeholders until real curriculum data exists).

**Fonts** (via `next/font/google`, wired in `app/layout.tsx`):
- `font-display` → Cormorant Garamond — headings and key numbers only, never body text
- `font-sans` → DM Sans — body text (Tailwind's default `font-sans`)
- `font-mono` → DM Mono — tabular/data text (grades, TEKS codes, dates)

**Signature element — the Ledger Line**: a thin rose-gold rule under every
table row / list item, echoing a physical grade book, applied via the
`.ledger-row` class (`app/globals.css`) or the `<LedgerRow>` component
(`components/ui/ledger-row.tsx`). Status changes get a small gold-leaf
stamp/check mark (`components/ui/status-stamp.tsx`) in the margin instead of
a colored pill badge. Use these two everywhere there's a list — see
`app/page.tsx` for a live example.

**Layout**: a left-rail navigator (`components/layout/nav-rail.tsx`) styled
like a bound planner's index/spine, not a generic hamburger sidebar. It
collapses to a top bar + slide-over on mobile (`components/layout/shell.tsx`).

**Motion**: subtle only — `animate-page-turn` / `animate-stamp-land` utility
classes (defined in `tailwind.config.ts`), both flattened to instant under
`prefers-reduced-motion: reduce` (see `globals.css`).

**Focus states**: a visible rose-gold `:focus-visible` outline is applied
globally in `globals.css`.

## Folder structure

```
app/
  layout.tsx                 Root layout — fonts, metadata (no app chrome)
  page.tsx                   Public marketing landing page
  globals.css                 Brand tokens, ledger-line, focus states
  (auth)/                     Route group: centered auth card layout, no nav
    login/ signup/ forgot-password/ reset-password/
  auth/callback/route.ts      OAuth + email-link code exchange (signup confirm, password reset)
  (app)/                      Route group: signed-in app chrome (<Shell>)
    dashboard/                 Protected placeholder — proves the auth wiring end-to-end

components/
  layout/                    Shell, NavRail — signed-in app chrome
  ui/                        Shared primitives (LedgerRow, StatusStamp, CourseTag)
  auth/                      LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm,
                              GoogleSignInButton, SignOutButton, form primitives
  curriculum/ assignments/ assessments/ portfolio/ admin/ billing/   (empty, next phases)

lib/
  supabase/
    client.ts                 Browser client (Client Components)
    server.ts                 Server client (Server Components/Actions/Route Handlers)
    admin.ts                  Service-role client — bypasses RLS, server-only, never import client-side
    middleware.ts              updateSession() — session refresh + route protection, called from middleware.ts
  auth/
    actions.ts                 Server Actions: signUp/signIn/signOut/requestPasswordReset/updatePassword
    session.ts                  getCurrentUser/getCurrentProfile/requireUser for Server Components
    rate-limit.ts                checkRateLimit/recordAttempt against auth_rate_limit_attempts
    identifiers.ts               Builds the IP/email identifiers rate limiting checks
    account.ts                   accountExistsForEmail — powers the login "no account found" message
    errors.ts                    Supabase AuthError → user-facing copy
    validation.ts                 Zod schemas for all four forms
    types.ts                      Shared Server Action state shape
  utils.ts                    cn() class-merge helper
  curriculum/ assignments/ assessments/ portfolio/ admin/ billing/   (empty, next phases)

types/
  supabase.ts                 Database type, hand-written to match supabase/migrations/*.sql
  index.ts                    Barrel export

supabase/
  migrations/                 SQL migrations — profiles, courses, subscriptions,
                               academic_calendars/calendar_days, auth_rate_limit_attempts
  README.md                   Supabase CLI workflow notes

middleware.ts                 Protects every route by default except an explicit public allowlist
```

Each feature domain (auth, curriculum, assignments, assessments, portfolio,
admin, billing) gets matching folders under `app/`, `components/`, and
`lib/` as it's built, so related code stays colocated by feature rather than
by type.

## Auth

Email/password + Google OAuth via Supabase Auth, all server-driven:

- **Signup / login / password reset** are Next.js **Server Actions**
  (`lib/auth/actions.ts`), not client-side Supabase calls — so rate
  limiting and validation can't be bypassed by disabling JS. **Google
  OAuth** is the one exception: it has to redirect the browser to Google,
  so `GoogleSignInButton` calls `signInWithOAuth` from the browser client.
- **Rate limiting**: every signup/login/password-reset attempt is checked
  against `auth_rate_limit_attempts` (service-role only, no RLS policies)
  before Supabase is ever called, and recorded after. Blocks after N
  *failures* in a time window, keyed by IP and email separately (see
  `lib/auth/rate-limit.ts` for the thresholds).
- **"No account found" on login**: Supabase's own error is the same
  generic "invalid credentials" for a wrong password and a non-existent
  user, by design. Since the product wants those distinguished,
  `lib/auth/account.ts` does one extra lookup against `profiles` on
  failure. That's a deliberate, small trade against user-enumeration
  hardening — see the comment there for the reasoning.
- **Route protection**: `middleware.ts` → `lib/supabase/middleware.ts`
  protects everything by default; only paths in its `PUBLIC_PATHS`
  allowlist (and anything under `/auth/`) are reachable while signed out.
  New protected pages need zero middleware changes.
- **Callback route** (`app/auth/callback/route.ts`) is the single landing
  point for signup confirmation links, password-reset links, and the
  Google OAuth redirect — all exchange a PKCE `code` for a session, then
  forward to `next`.

**Supabase dashboard setup** (once a project exists):
1. Run the migrations in `supabase/migrations/` (`supabase db push`, or
   apply via the SQL editor in order).
2. Authentication → URL Configuration: set Site URL and add
   `<site-url>/auth/callback` as a redirect URL (both prod and
   `http://localhost:3000/auth/callback` for local dev).
3. Authentication → Providers → Google: enable it and add the OAuth
   client ID/secret from Google Cloud Console.
4. Promote the first admin manually — `update profiles set role = 'admin'
   where email = '...'` — there's no self-serve admin signup.

## Database schema

Postgres migrations live in `supabase/migrations/`, applied in filename
order. All tested against a real Postgres instance (schema + triggers +
RLS policies, not just "does it parse") before being committed.

- **profiles** — one row per `auth.users` row, created automatically by a
  trigger on signup. `role`, `subscription_status`, and `email` are
  privileged columns: a `BEFORE UPDATE` trigger silently reverts changes
  to them from anyone who isn't an admin or a privileged backend context
  (service-role/postgres) — so a signed-in teacher can never self-promote
  to admin or fake their own subscription status via the API, while
  Stripe webhooks (billing phase) can still write `subscription_status`
  normally through the service-role client.
- **courses** — the 8 fixed subjects, seeded by the migration. Catalog
  metadata only, readable by anyone (including signed-out visitors);
  writes are admin-only.
- **subscriptions** — `tier` / `status` / Stripe IDs / `course_ids`
  (which courses a subscription unlocks). Teachers can only read their
  own row; all writes are admin/service-role (Stripe webhooks land in the
  billing phase). `has_course_access(course_id)` is defined now — not yet
  called by any policy — so future curriculum-content tables can gate
  reads with one line: `using (public.has_course_access(course_id))`.
- **academic_calendars** / **calendar_days** — one calendar per teacher
  per school year, with dated day types (regular/holiday/testing/
  early_release/block_day). RLS scopes both to their owning teacher.
- **auth_rate_limit_attempts** — backs the app-level rate limiting above.
  RLS is enabled with *no policies*, so it's reachable only via the
  service-role client, never through the anon/authenticated API.

`is_admin()` is a `SECURITY DEFINER` helper every other policy calls
instead of querying `profiles` directly — querying `profiles` from within
`profiles`' own RLS policy would recurse.

## Environment variables

See `.env.example`. Copy to `.env.local` (already git-ignored) and fill in:
- Supabase project URL + anon key (public), service role key (server-only)
- Stripe publishable key (public), secret key + webhook secret (server-only)
- `NEXT_PUBLIC_SITE_URL` — used to build auth email/OAuth redirect URLs

## Status

✅ Project scaffold, design system, folder structure, Supabase client wiring
✅ Auth (email/password + Google, password reset, rate limiting)
✅ Core database schema + RLS (profiles, courses, subscriptions, academic calendars)
⬜ Curriculum / assignments / assessments / gradebook / portfolio features
⬜ Stripe billing
⬜ Deployment config
