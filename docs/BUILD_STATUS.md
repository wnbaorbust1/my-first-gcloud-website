# BLUEPRINT BUILD STATUS

_Last updated: 2026-08-10 — Phase 2: Blueprint Business Assessment + Scoring_

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

**Authentication (Phase 1, Task 3)**
- Email/password sign up, log in, log out, forgot password, reset
  password — all real, working API routes backed by Postgres.
- NextAuth.js v4, JWT sessions (no DB session table).
- Passwords hashed with bcrypt (12 rounds). Reset tokens are random,
  stored only as a SHA-256 hash, single-use, 1-hour expiry.
- Google OAuth architected (`src/lib/auth.ts`) but inactive until
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set.
- Route protection lives in `src/proxy.ts` (Next 16 renamed `middleware`
  to `proxy`; same behavior).

**Roles & authorization (Phase 1, Task 4)**
- Roles: `MEMBER`, `FACILITATOR`, `ADMIN`, `SUPER_ADMIN`, plus
  `IMPLEMENTATION_SPECIALIST` reserved.
- Centralized in `src/lib/rbac.ts` (edge-safe) and `src/lib/session.ts`
  (`requireUser`, `requireRole`, `assertBusinessAccess`), enforced in
  `src/proxy.ts` and again server-side in layouts/routes — never UI-only.

**Database foundation (Phase 1, Task 5 & 6)**
- Full Prisma schema for every core entity (Users, Businesses,
  UserBusinessMemberships, Organizations, Sessions, Roadmaps, Goals,
  Documents, Resources, Facilitator relationships, Notifications,
  Subscriptions, AuditLogs).
- Multi-business architecture in place via `UserBusinessMembership`; MVP
  UI still exposes only one business per user.

**Design system (Phase 1, Task 7) & navigation (Task 8)**
- Tailwind v4 tokens for the Blueprint color system + a reusable
  component library (Button, Card, MetricCard, ProgressBar, StageBadge,
  ScoreCard, TaskCard, RoadmapItem, SessionCard, Alert, Modal, EmptyState,
  Input, Textarea, Select, Tabs, Label) in `src/components/ui/`.
- Desktop sidebar + mobile bottom nav in `src/components/nav/`.

**Business profile (Phase 1, Task 10)**
- `/business-profile` create/edit form; only business name required.

---

### Phase 2 — Blueprint Assessment, Scoring, Results

**Assessment content & scoring engine**
- 36-question bank across all 33 spec categories (8 Passion, 13 Power, 12
  Legacy) in `src/lib/assessment/questions.ts` — one question per
  category to keep the assessment to "a few minutes," plus extra
  questions so every spec question type (1–5 scale, Yes/No, single
  choice, multiple choice, short answer, number) is exercised at least
  once, not just architected.
- Content and scoring config are **idempotently self-seeded**
  (`src/lib/assessment/seed-content.ts`) the first time a business starts
  an assessment — no separate `npm run seed` step required to get a
  working app.
- `AssessmentScoringConfig` (DB row, not code) stores stage thresholds
  (default 65), stage weights, the "excellence" threshold (default 85),
  and status-label bands — an admin tool can retune these later without a
  code change or migration, per the spec's "scoring rules must be stored
  in a configurable way."
- `src/lib/assessment/scoring.ts` is pure, dependency-free scoring logic:
  normalizes each answer type to 0–100, averages into category scores,
  averages categories into stage scores ("normalized category averages"
  per spec), weights stages into the Business Health Score, and
  implements the **progressive** session-matching logic exactly as
  specified (Passion gate → Power gate → Legacy gate → weakest-of-three
  or GROWTH once all three clear the excellence threshold) — verified
  live against both branches (see Tests/Checks).

**Assessment experience**
- `/assessment`: welcome screen → one question at a time → stage
  transition screens (Passion→Power, Power→Legacy) → completion screen →
  results. Progress header shows question count, percent, and
  stage-colored progress bar.
- Autosave on every answer (immediate for scale/yes-no/choice questions,
  debounced 600ms for text/number) via `PATCH /api/assessment/[id]/responses`.
  Revisiting `/assessment` resumes exactly at the first unanswered
  question — verified live, not just by inspection.
- All 6 question types render with large, accessible selectable
  cards/inputs and a visible checkmark + border + stage color on
  selection (not color alone).
- Business-scoped auth: every response write re-checks
  `assertBusinessAccess` against the assessment's owning business.

**Results & score detail**
- `/assessment/results/[assessmentId]`: three stage score rings, Business
  Health Score, a "Current Blueprint Stage" hero built from the real
  recommendation, Top 3 Strengths / Top 3 Priorities computed from actual
  category scores, a dynamically composed "why this session" reason
  string, a next-best-action pulled from the lowest-scoring category's
  real content, and the recommended session card. No hard-coded scores
  anywhere in this flow.
- `/assessment/results/[assessmentId]/stage/[stage]`: every category in
  that stage with its score, status label (from the configurable bands),
  "Why It Matters," and "Recommended Next Step" — the spec's Score Detail
  page, generalized to list a full stage instead of one hard-coded
  category.
- Dashboard updated: score cards link to the relevant stage detail page
  once an assessment is completed, and a "View My Full Results" link
  appears next to the Blueprint Scores heading.
- Revisiting `/assessment` after completion redirects to the existing
  results page instead of silently starting a duplicate assessment;
  completed assessments are never deleted, so reassessment (a future
  "retake" entry point) won't erase history.

## IN PROGRESS

- Nothing left mid-implementation from Phase 1 or Phase 2.

## NOT STARTED

- Session registration/attendance, facilitator participant view,
  post-session summaries (next phase).
- Personalized Roadmap generation, Business Builder activities, Blueprint
  AI, My Blueprint binder, Goals UI, Resources library.
- Admin/Facilitator functionality beyond role-gated placeholder shells
  (including any admin UI to edit `AssessmentScoringConfig` — the data
  model supports it, no UI yet).
- Billing. Transactional email (see Known Issues).

## KNOWN ISSUES

1. **No email provider** — unchanged from Phase 1; `forgot-password`
   logs/returns the reset link instead of emailing it.
2. **`next-auth@4` / `@auth/core` advisories** — unchanged from Phase 1,
   not reachable by the Credentials-only setup in use.
3. **No automated test suite.** Phase 2 was verified with a real Postgres
   migration, `next build`, `eslint`, and live HTTP scripts that signed
   up test users, drove all 36 questions through autosave, completion,
   and both recommendation branches (progressive gate and GROWTH), then
   inspected the DB and rendered HTML directly — not a checked-in test
   suite. Add one in a future phase.
4. **The recommended session is a label, not a bookable thing yet.** The
   Results page's CTA links to `/sessions` (still a placeholder) — Phase
   2 explicitly excludes registration, so there is nothing to link to yet
   without overpromising.
5. **"Most strategic growth opportunity" is an interpreted rule.** The
   spec leaves this phrase undefined when all three stages clear their
   threshold. Implemented as: recommend the weakest of the three stages
   unless *all three* also clear `excellenceThreshold` (default 85), in
   which case recommend a general GROWTH session. Documented here and in
   `src/lib/assessment/scoring.ts` so it's easy to revise.

## DATABASE CHANGES

- New migration: `prisma/migrations/20260810175322_assessment_scoring`.
- `AssessmentQuestion` gained `category`, `questionType` (new enum
  `QuestionType`), `options` (Json, choice questions), `minValue`/
  `maxValue` (Number questions), `weight`, `includeInScoring`.
- `AssessmentResponse.value` changed from `Int` to `Json` — one flexible
  column whose shape depends on the question's type (number / boolean /
  string / string[]) instead of four sparse nullable columns.
- `Assessment` gained `assessmentVersion`, `healthScorePercent`,
  `recommendedSessionType` (new enum `RecommendedSessionType`:
  PASSION/POWER/LEGACY/GROWTH), `recommendationReason`.
- New model `AssessmentCategoryScore` — persisted per-category scores
  (not recomputed on read) so history stays accurate if question content
  changes later.
- New model `AssessmentScoringConfig` — the configurable scoring rules
  described above.
- Seed data: 36 `AssessmentQuestion` rows + 1 active
  `AssessmentScoringConfig` row, created lazily on first use rather than
  via a migration seed script (see Important Decisions).

## IMPORTANT DECISIONS

- **Enums vs. strings** (Phase 1, unchanged): closed code-referenced sets
  are Postgres enums; open-ended categorical fields are validated
  strings.
- **No NextAuth Prisma adapter** (Phase 1, unchanged).
- **Lazy, idempotent content seeding instead of a seed script.**
  `ensureAssessmentContentSeeded()` runs a cheap existence check at the
  top of the "start assessment" path and only inserts if empty. This
  means a fresh clone of the repo "just works" the first time someone
  starts an assessment, in any environment, without a manual seed step —
  at the cost of the first request after a fresh DB doing slightly more
  work. A future admin content tool would edit these rows directly rather
  than re-running a seed script.
- **Only `SCALE_1_5` and `YES_NO` questions score by default.**
  `SINGLE_CHOICE`/`MULTIPLE_CHOICE`/`SHORT_ANSWER` have no defined
  numeric mapping in v1 and are always excluded from scoring, even if a
  future question sets `includeInScoring: true`; `NUMBER` questions *can*
  score (normalized against `minValue`/`maxValue`) but none in the v1
  bank do. This keeps "no hard-coded fake results" honest — nothing gets
  a numeric score without a defined, documented way to compute one.
- **Category score = single question's score when a category has one
  question (true for all 33 in v1).** The engine supports multiple
  weighted questions per category for when content is expanded later.
- **Stage score = unweighted average of that stage's category scores**,
  per the spec's "normalized category averages" — a category with only
  one question counts the same as one with several, so breadth across
  categories matters more than depth in any single one.

## NEXT RECOMMENDED PHASE

Build the **Blueprint Session system**: session offerings, member
registration/waitlist, facilitator attendance marking, and the
qualifying-session unlock flag — so a completed assessment's recommended
session becomes something a member can actually register for, and
attendance becomes the gate for the post-session Blueprint Builder
dashboard.
