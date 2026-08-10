# BLUEPRINT BUILD STATUS

_Last updated: 2026-08-10 — Phase 1: Project Foundation + Architecture_

## COMPLETE

**Design standard**
- Blueprint Visual Experience Directive documented in
  [`BLUEPRINT_MASTER_SPEC.md`](./BLUEPRINT_MASTER_SPEC.md) as a mandatory,
  permanent standard for every future screen.

**Stack & project structure**
- Next.js 16 (App Router, TypeScript, Turbopack), React 19, Tailwind CSS v4.
- Route groups: `(marketing)` public site, `(auth)` sign-in flows, `(app)`
  authenticated member shell, plus top-level `facilitator/` and `admin/`
  areas.
- Prisma 7 ORM on Postgres (driver adapter `@prisma/adapter-pg`), connected
  to a real local Postgres instance for this phase (see Database Changes).

**Authentication (Task 3)**
- Email/password sign up, log in, log out, forgot password, reset
  password — all real, working API routes backed by Postgres, verified
  end-to-end over HTTP (see Tests/Checks in the phase summary).
- NextAuth.js v4, JWT sessions (no DB session table) — session persists
  across requests via a signed cookie.
- Passwords hashed with bcrypt (12 rounds). Reset tokens are random,
  stored only as a SHA-256 hash, single-use, 1-hour expiry.
- Google OAuth is architected (provider wiring + user upsert logic in
  `src/lib/auth.ts`) but stays inactive until `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET` are set — no Google setup was done this phase.
- `src/middleware.ts`... see note in Important Decisions — file is at
  `src/proxy.ts` (Next 16 renamed the convention from `middleware` to
  `proxy`; same behavior).

**Roles & authorization (Task 4)**
- Roles: `MEMBER`, `FACILITATOR`, `ADMIN`, `SUPER_ADMIN`, plus
  `IMPLEMENTATION_SPECIALIST` reserved in the `Role` enum and
  `src/lib/rbac.ts` for a future phase.
- Centralized authorization in `src/lib/rbac.ts` (edge-safe, no DB import)
  and `src/lib/session.ts` (`requireUser`, `requireRole`,
  `assertBusinessAccess`).
- Enforced in two places, not just the UI: `src/proxy.ts` blocks
  `/admin/*` and `/facilitator/*` by role before the page renders, and
  `/admin`, `/facilitator` layouts call `requireRole` again server-side.
  `assertBusinessAccess` is the pattern future business-scoped routes
  should call before returning data.

**Database (Task 5 & 6)**
- Full Prisma schema for every entity listed in Task 5 (Users, Businesses,
  UserBusinessMemberships, Organizations, Assessments +
  AssessmentQuestions/Responses/Scores, Sessions (`SessionOffering`) +
  SessionRegistrations + Attendance, Roadmaps + RoadmapTasks +
  TaskTemplates + TaskResponses, Goals, Documents + DocumentSections,
  Resources, FacilitatorAssignments + FacilitatorNotes, Notifications,
  Subscriptions, AuditLogs), with `createdAt`/`updatedAt`, foreign keys,
  and status fields.
- Multi-business architecture in place (Task 6): `UserBusinessMembership`
  join table with an `OWNER`/`COLLABORATOR` role, so a user can eventually
  own or collaborate on more than one `Business`. MVP UI only exposes
  creating/editing a single business today — see Next Recommended Phase.

**Design system (Task 7)**
- Tailwind v4 tokens in `src/app/globals.css`: navy, cream, gold, and the
  three stage colors (passion/pink, power/orange-gold, legacy/purple),
  plus semantic success/warning/danger/info.
- Reusable components in `src/components/ui/`: Button, Card (+ Header/
  Title/Description/Content/Footer), MetricCard, ProgressBar, StageBadge,
  ScoreCard (progress ring), TaskCard, RoadmapItem, SessionCard, Alert,
  Modal, EmptyState, Input, Textarea, Select, Tabs, Label.
- Fonts: Inter (interface) + Fraunces (display serif, used sparingly per
  spec section 31).

**Navigation (Task 8)**
- Desktop sidebar + mobile bottom nav (4 primary + "More" sheet) in
  `src/components/nav/`, driven by one shared config
  (`nav-items.ts`) so adding a page means editing one file.

**Member dashboard shell (Task 9)**
- Welcome header, business name, three stage score cards (render `—`,
  never a fake number, when no assessment score exists), "Complete your
  Blueprint Assessment to begin" CTA when there's no completed
  assessment, and honest empty states for Next Best Move, Today's
  Blueprint, Roadmap Progress, and Upcoming Session.

**Business profile (Task 10)**
- `/business-profile` form with every field from the spec; only
  business name is required, everything else is skippable.
- `POST /api/business` creates-or-updates the caller's business
  (zod-validated, auth-checked) — verified end-to-end over HTTP.

## IN PROGRESS

- Nothing left mid-implementation. Every Phase 1 task above was carried
  to a working, verified state before this phase closed.

## NOT STARTED

(Deliberately out of scope for this phase — see the master spec for what
each of these owes the Visual Experience Directive when built.)

- Blueprint Assessment (question flow, scoring, stage transitions).
- Session Match / Session Attendance flows (schema exists; no booking UI).
- Personalized Roadmap generation (schema + static `RoadmapItem`
  component exist; no engine that populates `RoadmapTask` rows).
- Business Builder activities, Blueprint AI, My Blueprint binder,
  Progress story, Goals UI, Resources library.
- Admin/Facilitator functionality beyond role-gated placeholder shells.
- Billing (first month free → $9.99/mo or $100/yr) — `Subscription` model
  exists; no Stripe/payment integration, per instructions.
- Transactional email (see Known Issues).

## KNOWN ISSUES

1. **No email provider.** Signup and password-reset don't send real
   email. `forgot-password` logs the reset link server-side and, in
   non-production only, returns it in the API response so the flow is
   testable. Wire a real provider (Postgres-friendly options: Resend,
   Postmark, SES) before this reaches real users.
2. **`next-auth@4.24.15`'s bundled `@auth/core` (0.34.3) has 3 known
   advisories** (`npm audit`): a malformed-Bearer-header crash in
   `getToken()`, an email-normalizer homoglyph issue (Email/magic-link
   provider only — not used here), and OAuth state/nonce/PKCE cookies not
   bound to their provider (relevant only once a second OAuth provider is
   active). None of the three are triggered by the Credentials-only setup
   shipped this phase. The real fix is Auth.js v5, which is still beta and
   a bigger migration (different session/callback API) — deferred rather
   than done under time pressure. Re-evaluate before adding Google OAuth.
3. **No automated test suite yet.** Verification this phase was a real
   Postgres migration + `next build` + `eslint` + live HTTP smoke tests
   (signup, login, session, protected-route redirects, role-gated
   redirects, business create, forgot/reset password) against a running
   dev server — not unit/integration tests. Add a test runner in a future
   phase.
4. **`Business.status`, `Organization.status`, etc. are free-text
   strings**, not enums — intentional (see Important Decisions), but
   means nothing stops a typo'd status value at the DB layer today. Zod
   validation should gate any field before it reaches the DB as these
   modules get built out.

## DATABASE CHANGES

- Provider: PostgreSQL (Prisma 7, `@prisma/adapter-pg` driver adapter —
  Prisma 7 requires an explicit adapter, no more implicit
  connection-string-only clients).
- One migration: `prisma/migrations/20260810174049_init` — creates every
  model in `prisma/schema.prisma` (see COMPLETE → Database above for the
  full entity list) plus enums for `Role`, `BusinessMembershipRole`,
  `BlueprintStage`, `AssessmentStatus`, `SessionOfferingStatus`,
  `RegistrationStatus`, `AttendanceStatus`, `RoadmapStatus`, `TaskStatus`,
  `TaskPriority`, `GoalStatus`, `SubscriptionPlan`, `SubscriptionStatus`.
- Generated client output: `src/generated/prisma` (gitignored — run
  `npx prisma generate` after cloning or after any schema change).
- Local dev database: a real Postgres 16 instance, database
  `blueprint_dev`, user `blueprint` — see `.env.example` for the
  connection string shape. Production should point `DATABASE_URL` at
  Cloud SQL for PostgreSQL (or another managed Postgres); nothing in the
  schema or client setup is dev-only.

## IMPORTANT DECISIONS

- **Enums vs. strings.** Closed, code-referenced sets that the app
  branches on (`Role`, `BlueprintStage`, `TaskStatus`, ...) are Postgres
  enums. Open-ended categorical fields product will likely reword or
  extend (industry, business stage, revenue range, CRM used, etc.) are
  plain `String` with zod validation at the API boundary instead, so
  adding an option is a content change, not a migration.
- **No NextAuth Prisma adapter.** `@auth/prisma-adapter` expects a `name`
  field and owns OAuth account/session persistence; Blueprint's `User`
  model uses `firstName`/`lastName`, and Credentials-based auth forces JWT
  sessions anyway (adapter database sessions aren't compatible with a
  Credentials provider). Both Credentials and the (currently inactive)
  Google provider instead find-or-create the `User` row directly inside
  the `jwt` callback in `src/lib/auth.ts`. This keeps one code path for
  both auth methods and avoids the schema mismatch.
- **`middleware.ts` → `proxy.ts`.** Next.js 16 deprecated the
  `middleware` file convention in favor of `proxy` (same API, renamed
  export). Built this phase on the new convention rather than starting on
  a deprecated one.
- **One business per user in the UI, many in the data model.** Schema
  supports multiple businesses per user (Task 6) via
  `UserBusinessMembership`, but `/business-profile` and
  `POST /api/business` only expose create-or-update-the-first-business for
  now, matching the Task 10 MVP scope. Adding a "create another business"
  entry point later doesn't require a data model change.
- **Single light theme, no dark mode.** The Visual Experience Directive
  calls for warm cream backgrounds as the primary surface; Blueprint ships
  one considered light theme rather than an OS-driven dark variant that
  would fight that direction.

## NEXT RECOMMENDED PHASE

Build the **Blueprint Assessment** (Passion → Power → Legacy): welcome
screen, one-question-at-a-time flow with the progress header, stage
transition screens, completion screen, and scoring that writes
`AssessmentResponse`/`AssessmentScore` rows — replacing the `/assessment`
placeholder and feeding real numbers into the dashboard score cards and
"Complete your Blueprint Assessment to begin" CTA already wired up this
phase.
