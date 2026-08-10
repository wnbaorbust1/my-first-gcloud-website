# BLUEPRINT BUILD STATUS

_Last updated: 2026-08-10 — Phase 5: Personalized Roadmap + Business Builder_

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

---

### Phase 3 — Session System, Registration, Attendance

**Session content**
- `SessionOffering` extended with every spec field (who should attend,
  topics, learning outcomes, what you'll build, what to bring, prep
  instructions, resources, format/location/virtual link, timezone,
  price, facilitator, registration deadline) plus a `sessionType`
  (`RecommendedSessionType`: PASSION/POWER/LEGACY/GROWTH) matching the
  assessment's recommendation output.
- 4 session templates × 2 upcoming dated instances, idempotently
  self-seeded on first visit to `/sessions` (same lazy pattern as
  assessment content) — Blueprint Passion/Power/Legacy Sessions (spec)
  plus a Growth session for the GROWTH recommendation branch.
  "Architecture must support unlimited future session types" is handled
  by not constraining title/content to those four — any number of
  differently-titled offerings can share one `sessionType`.

**Registration, waitlist, attendance**
- `SessionRegistration.status` is one lifecycle enum — REGISTERED,
  WAITLISTED, CANCELLED, ATTENDED, NO_SHOW, COMPLETED — replacing the
  separate `Attendance` model from Phase 1 (never used, would have let
  the two statuses drift out of sync).
- `src/lib/sessions/qualification.ts`: `registerForSession` waitlists
  automatically once capacity is full and stores queue position;
  `cancelRegistration` promotes the longest-waiting waitlisted member
  into a freed seat. Both verified live: a capacity-1 session correctly
  waitlisted a second registrant at position 1, and cancelling the first
  promoted the second to REGISTERED.
- `markAttendance` is the **only** place `Business.builderAccessEligible`
  / `sessionCompletedAt` / `qualifyingSessionRegistrationId` get written
  — set together, in one transaction, only when a facilitator/admin marks
  a registration ATTENDED or COMPLETED. Verified live: marking one
  business's registration ATTENDED unlocked it while an unrelated
  business with no attended session stayed locked.

**Member session page**
- `/sessions`: recommended session shown first (why it was recommended,
  description, what you'll learn/build, what to bring, available dates)
  above an "Other Sessions" list grouped by type. Register / Join
  Waitlist / cancel are real, working actions against real capacity.

**Facilitator participant view & notes**
- `/facilitator/participants`: every business a facilitator is either
  assigned to (`FacilitatorAssignment`) or is running a session for
  (`SessionOffering.facilitatorId`) — with real assessment scores,
  top strengths/priorities, primary goal/challenge, recommended session,
  and their session registrations with an inline attendance control.
- `FacilitatorNote` extended with `noteType` (Private / Participant-
  Visible / Recommendation / Task Recommendation) and `assignedPriority`,
  replacing the old single `isPrivate` boolean; addable from the
  participant view.

**Post-session summary**
- New `PostSessionSummary` model + `/facilitator/participants/summary/[registrationId]`
  editor: top 3 priorities, 30/60/90-day goals, recommended tasks and
  resources, next suggested session — facilitator/admin-editable, no AI.

**Authorization fix found by live testing:** `assertBusinessAccess`
originally only granted a facilitator access via a standing
`FacilitatorAssignment` row, which meant a facilitator running a session
could *see* a participant (the participant-list query already checked
both paths) but got a 403 trying to mark their attendance. Fixed by
extending `assertBusinessAccess` itself to also recognize "this
facilitator runs a session this business registered for," so every route
that depends on it (attendance, notes, summary) is consistent with what
the UI shows. Verified: a member cannot mark their own attendance, edit
someone else's summary, or read another business's summary — all 403.

---

### Phase 4 — Personalized Blueprint Dashboard

**Roadmap generation on unlock**
- `TaskTemplate` seeded (lazily, same pattern as assessment/session
  content) with 15 starter tasks — 5 per stage, each Must Do/Should Do/
  Bonus — framed as a checklist, not the interactive Business Builder
  workbook (still out of scope per this prompt and the last two).
- `src/lib/roadmap/generate.ts`: `ensureRoadmapGenerated(businessId)` is
  called once, automatically, the moment `markAttendance` unlocks
  `builderAccessEligible` — no manual step. "Personalization" is a
  deterministic rule, not AI: stages are ordered by the business's own
  assessment scores, weakest first, and only that first stage's tasks
  start `NOT_STARTED` — every later stage's tasks start `LOCKED`.
  Verified live: a business scoring Passion 75 / Power 79 / Legacy 77 got
  Passion tasks unlocked first, then Legacy (77 < 79), then Power last —
  exactly the weakest-first order the scores implied.

**Dashboard funnel**
- `src/lib/dashboard/data.ts` is one query bundle returning a
  discriminated state: `no-business` → `no-assessment` → `pre-session`
  → `builder`. `/dashboard` renders a genuinely different screen for
  each, per spec:
  - **pre-session**: real stage scores (clickable through to score
    detail), a checklist (Assessment Complete ✅ / Session Registered /
    Session Attendance ⏳ / Blueprint Builder 🔒) built from actual
    registration status, and the exact unlock message from the spec.
  - **builder**: Current Business/Stage/Health header, a dominant Next
    Best Action card (single highest-priority `NOT_STARTED` task, real
    "why it matters" copy, Impact derived from priority), Today's
    Blueprint (one task per Must/Should/Bonus tier), Stage Progress
    cards (real roadmap-completion percent per stage, linking to
    `/roadmap`), Roadmap Snapshot (real Completed/In Progress/Ready/
    Locked counts), Goal Snapshot (real user-set progress, never
    fabricated), Sessions (last/upcoming/next-recommended, all real
    registrations), Recent Wins.
  - Both smart empty states from the spec are wired to real conditions:
    "Your facilitator is preparing your Blueprint Roadmap" (no roadmap
    tasks yet) and "Set your first 90-day Blueprint goal" (no active
    goal), not shown unconditionally.
- Verified live end-to-end: a fresh business walked through
  no-assessment → pre-session (registered, not yet attended) →
  attendance marked → builder-unlocked dashboard with the real,
  weakest-first roadmap, in one continuous test. A second, unrelated
  business with no attended session was confirmed to stay on the locked
  `/roadmap` empty state the whole time — no cross-contamination.

**Real destinations for dashboard links**
- `/roadmap` now renders the actual `RoadmapItem` stepper (checkmarks,
  current-stage highlight, locks) from real `RoadmapTask` rows, replacing
  the Phase 1 placeholder — needed since Stage Progress cards and the
  Roadmap Snapshot both link here.
- `/goals` now supports real creation (`POST /api/goals`) and progress
  updates (`PATCH /api/goals/[id]`, 0/25/50/75/100%, auto-completes at
  100%) — needed since the Goal Snapshot empty state links here.
- `TaskCard` gained an `href` prop so its CTA can render as a real link
  (to `/build`) from a server component — the Today's Blueprint cards
  no longer have an inert "Start" button.

**Mobile**
- No special-cased mobile layout logic was needed: the builder
  dashboard's DOM order already puts Next Best Action immediately after
  the header stats and before Today's Blueprint and Stage Progress,
  which is the spec's mobile priority order — verified with a 390px
  viewport screenshot.

---

### Phase 5 — Personalized Roadmap + Business Builder

**The core differentiator**: members now build their business inside the
platform, not just read about it.

**30-task library with real dependencies**
- `src/lib/roadmap/task-templates.ts`: all 30 spec tasks (9 Passion, 12
  Power, 9 Legacy), each with `whyItMatters` (LEARN), `thinkPrompt`
  (THINK), 2–5 structured `instructions` steps (BUILD), `implementGuidance`
  (IMPLEMENT), `measurePrompt` (MEASURE), plus category, difficulty,
  impact, estimated time, and a `blueprintDestination` key.
- Real dependency graph (spec TASK DEPENDENCIES) via a `TaskTemplate`
  self-relation — e.g. "Create Lead Generation Plan" requires "Define
  Ideal Customer," "Define Core Offer," and "Build Pricing Strategy," the
  spec's own example. Seeded in two passes (insert all 30, then connect
  prerequisites by title) since Prisma needs real row ids to link a
  self-relation.

**Personalized generation, verified with two different businesses**
- `src/lib/roadmap/generate.ts` scores every task from assessment
  category/stage gaps, the stage of the session just attended, business
  maturity (`businessStage`), active goal keywords, and facilitator
  `TASK_RECOMMENDATION`/`RECOMMENDATION` notes (a note naming a task
  title bumps its priority) — that score sets **order**. **Lock status**
  is completely separate and purely dependency-driven: a task starts
  Ready only if it has zero prerequisites, regardless of score.
- "Existing completed work": if a business-profile field already answers
  part of a task (e.g. `idealCustomer` → "Define Ideal Customer"), that
  task is pre-seeded with a real draft answer and nudged to IN_PROGRESS
  — never marked falsely COMPLETE from one field.
- Verified live: Business A (Passion 25%, "Idea Stage") got a
  Passion-first roadmap with "Define Ideal Customer" pre-filled from its
  profile and bumped to IN_PROGRESS; Business B (Power 21%, "Scaling")
  got a completely different Power-first roadmap — confirming different
  users get different priorities from their own data, not a fixed order.
- Completing "Define Business Purpose" was verified to instantly unlock
  both of its real dependents ("Create Mission Statement," "Create
  Vision Statement") via `recomputeUnlocks`, called after every
  completion.

**Business Builder task page**
- `/build` lists a business's roadmap tasks with status; `/build/[taskId]`
  is the full LEARN → THINK → BUILD → SAVE → IMPLEMENT → MEASURE page —
  Why This Matters, a reflective prompt, the structured step form, Save
  Draft / Save to My Blueprint / Mark Complete, then Implement and
  Measure guidance.
- Answers are structured (`TaskResponse.answers` is `{ [stepKey]:
  answer }`, one row per task, not a paragraph of prose) — spec: "Do not
  store everything only as unstructured notes."
- **Save to Blueprint** (verified live) upserts a `DocumentSection` on
  the business's "My Blueprint" `Document`, keyed by
  `blueprintDestination`, rendered from the structured answers — real
  content, not a placeholder. **Mark Complete** always saves to the
  Blueprint too, sets `COMPLETED` + `completedAt`, and recomputes
  unlocks — all three read back correctly in testing.

**Facilitator roadmap control**
- `/facilitator/participants/roadmap/[businessId]`: assign an unused
  library task, add a fully custom one-off task, change priority,
  move up/down, pause/unlock (unlock deliberately bypasses the
  dependency check — an explicit facilitator override), and remove a
  task. Every facilitator-touched task is flagged `facilitatorAdjusted`.
- All six actions verified live via the API, plus that a MEMBER gets 403
  from every facilitator-only route and a LOCKED task can't be completed
  by anyone (409).

## IN PROGRESS

- Nothing left mid-implementation from Phase 1 through 5.

## NOT STARTED

- Blueprint AI, My Blueprint's dedicated navigation page (sections exist
  as `DocumentSection` rows populated by Builder tasks; there's no page
  yet organizing them into the spec's PASSION/POWER/LEGACY layout — next
  phase), document generation/download, Resources library, Progress
  page's "story" narrative.
- Admin/Facilitator functionality beyond role-gated placeholder shells,
  the participant view, and the roadmap control page built this phase
  (no admin UI yet to edit `AssessmentScoringConfig`, create
  `SessionOffering`s, or assign `FacilitatorAssignment`s directly).
- Billing. Transactional email (see Known Issues).
- A member-facing view of their own Post-Session Summary.
- Per-stage roadmap sub-pages — Stage Progress cards all link to the one
  `/roadmap` page rather than a stage-scoped view (spec says "each opens
  respective roadmap"; simplified to one page showing every stage).
- "My Blueprint" sections with no task mapping yet: **Technology** and
  **Impact** (Prompt 6's section list has a couple more entries than
  Phase 5's 30-task library directly populates — see Important
  Decisions). They'll render an honest empty state, not fake content.

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
6. **Correcting a mis-marked attendance doesn't revoke Builder access.**
   Once `builderAccessEligible` flips true it stays true even if a
   facilitator later changes ATTENDED back to NO_SHOW — documented in
   `src/lib/sessions/qualification.ts`. Revisit if this becomes a real
   workflow need.
7. **No UI yet to create a `SessionOffering`, assign a
   `FacilitatorAssignment`, or set `SessionOffering.facilitatorId`.**
   This phase's tests set these via direct DB writes to exercise the
   registration/attendance/participant-view logic; an admin content tool
   is the natural next home for them.
8. **Seat counts are computed, not cached.** `getSeatsRemaining` counts
   REGISTERED rows on every read rather than maintaining a denormalized
   counter on `SessionOffering` — simpler and always correct, at the cost
   of an extra query per session shown. Fine at this scale; revisit if a
   session list ever needs to render hundreds of offerings at once.
9. **Two "My Blueprint" sections (Technology, Impact) have no task
   mapping yet.** The 30-task library maps almost 1:1 to Prompt 6's
   section list, but not perfectly — see Important Decisions. Adding a
   task later that targets either `blueprintDestination` fills them in
   automatically, no migration needed.
10. **`prisma migrate dev` doesn't work in this non-interactive
    environment** (it wants a TTY to confirm destructive-looking
    warnings, e.g. new unique constraints on empty tables). Every Phase 5
    migration was generated with `prisma migrate diff --script` and
    applied with `prisma migrate deploy` instead — same resulting SQL,
    just without the interactive confirmation step. Worth trying
    `prisma migrate dev` directly in a normal terminal in later phases.

## DATABASE CHANGES

- New migration: `prisma/migrations/20260810183045_roadmap_builder_dependencies`.
  - `TaskTemplate`: added `category`, `whyItMatters`, `thinkPrompt`,
    `instructions` (Json), `implementGuidance`, `measurePrompt`,
    `difficulty` (new enum `TaskDifficulty`), `impact` (new enum
    `TaskImpact`), `outputType`, `blueprintDestination`; removed
    `description`; added a self-relation (`prerequisites`/`unlocks`) for
    TASK DEPENDENCIES.
  - `TaskStatus` gained `PAUSED`.
  - `RoadmapTask`: added `category`, `facilitatorAdjusted`.
  - `TaskResponse`: replaced free-text `content` with structured `answers`
    (Json) and added `savedToBlueprintAt`; `roadmapTaskId` is now unique
    (one current response per task, not a history).
  - `DocumentSection`: added `sourceRoadmapTaskId`, `lastEditedAt`, and a
    `(documentId, title)` unique constraint so "Save to Blueprint" can
    upsert instead of duplicate.
  - The old Phase 4 15-task `TaskTemplate` library was truncated and
    replaced entirely by the 30-task library below — no real
    user/business data existed yet to migrate.
- New migration: `prisma/migrations/20260810182749_task_template_priority`
  — `TaskTemplate` gained `priority` (`TaskPriority`), so a generated
  `RoadmapTask` can inherit Must Do/Should Do/Bonus from its template.
- New migration: `prisma/migrations/20260810182438_goal_progress` —
  `Goal` gained `progressPercent` (`Int`, default 0, user-set only).
- New migration: `prisma/migrations/20260810181044_sessions_registration_attendance`.
  - `SessionOffering`: added `sessionType` (new enum
    `RecommendedSessionType`, replacing the unused `stage` field),
    `whoShouldAttend`, `topics`, `learningOutcomes`, `whatYoullBuild`,
    `whatToBring`, `preparationInstructions`, `resources`, `format` (new
    enum `SessionFormat`), `timezone`, `virtualLink`, `priceCents`,
    `registrationDeadline`, `facilitatorId`.
  - `SessionRegistration`: `RegistrationStatus` gained `ATTENDED`,
    `NO_SHOW`, `COMPLETED`; added `waitlistPosition`, `checkedInAt`,
    `attendanceNotes`.
  - Removed the `Attendance` model (merged into `SessionRegistration`,
    see Phase 3 summary above).
  - `FacilitatorNote`: added `sessionRegistrationId`, `noteType` (new
    enum `FacilitatorNoteType`), `assignedPriority`; removed `isPrivate`.
  - New model `PostSessionSummary`.
  - `Business`: added `builderAccessEligible`, `sessionCompletedAt`,
    `qualifyingSessionRegistrationId`.
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

## IMPORTANT DECISIONS (Phase 3 additions)

- **One registration status enum instead of a separate Attendance
  model.** See Phase 3 summary — avoids two status concepts that could
  disagree about whether someone attended.
- **`markAttendance` is the single writer of the Builder-unlock fields.**
  Anything that needs to know "why is this business unlocked" can trace
  it to one registration via `qualifyingSessionRegistrationId`, instead
  of unlock logic being duplicated wherever attendance might be marked.
- **Facilitator access = assigned OR running the session**, checked in
  `assertBusinessAccess` itself (not just the participant-list query) so
  every route behind that check — attendance, notes, summaries — agrees
  with what the UI shows a facilitator they can do.

## IMPORTANT DECISIONS (Phase 4 additions)

- **Roadmap "personalization" is a deterministic scoring-based rule, not
  AI.** Stage order = assessment stage scores ascending; only the first
  stage unlocks. No LLM call, no per-user prompt — matches "Do not add
  full AI functionality yet" while still giving each business a
  genuinely different starting roadmap based on their own data.
- **Goal progress is user-set, never derived.** Rejected computing it
  from elapsed time toward the target date (misleading — a goal isn't
  25% done just because 25% of the time has passed) or from linked task
  completion (no Goal↔Task linking model exists yet). A manual 0/25/50/
  75/100% control is honest about what's actually known.
- **`TaskCard` gained an `href` prop rather than adding client-side
  interactivity to the dashboard.** Keeps `/dashboard` a server
  component (one query bundle, no client-side data fetching) while still
  giving every task card a working, real destination.
- **One `/roadmap` page, not one per stage.** The spec's Stage Progress
  cards say "each opens respective roadmap"; since all stages already
  render together on one page in priority order (with locks), a second
  navigation layer would fragment the same information without adding
  clarity. Revisit if the roadmap grows large enough that stage-scoped
  views become genuinely useful.

## IMPORTANT DECISIONS (Phase 5 additions)

- **Order (personalization) and lock status (dependencies) are fully
  independent mechanisms.** A weak-category task can still be LOCKED if
  its prerequisites aren't done; a strong-category task can still be
  first if it happens to have no prerequisites. This matches the spec
  literally — ROADMAP ENGINE and TASK DEPENDENCIES are separate
  sections — and avoids the two rules fighting each other.
- **"Existing completed work" pre-fills a draft, never a false
  COMPLETE.** One business-profile field (e.g. `idealCustomer`) answers
  one step of a multi-step task at best. Marking the whole task
  COMPLETE from partial data would violate "no hard-coded fake results"
  just as much as a fabricated score would.
- **Facilitator recommendations influence generation via note-text
  matching, not a dedicated task-targeting field.** A `FacilitatorNote`
  with `noteType: TASK_RECOMMENDATION` whose text contains a task's
  title (case-insensitive) bumps that task's priority at generation
  time. Simple and works today; a real "target this specific task" field
  on `FacilitatorNote` would be more precise if this proves too fragile
  in practice.
- **My Blueprint's section list and the 30-task library don't map
  perfectly 1:1.** Prompt 6 lists a couple more Power/Legacy sections
  (Technology, Impact) than Prompt 5's task library directly produces.
  Rather than invent tasks not in the spec's INITIAL TASK LIBRARY to
  force a perfect match, those two sections simply have no
  `blueprintDestination` pointing at them yet and render an honest empty
  state — consistent with "no hard-coded fake results" applying to
  content structure, not just scores.
- **`prisma migrate dev` → `migrate diff --script` + `migrate deploy`.**
  This sandbox's non-interactive shell can't answer `migrate dev`'s
  confirmation prompts for "looks destructive" warnings (new unique
  constraints on tables that are actually empty). Generating the SQL
  with `diff` and applying it with `deploy` produces an identical
  migration file with the same guarantees, just without the prompt.

## NEXT RECOMMENDED PHASE

Build **My Blueprint**: a dedicated navigation page organizing every
`DocumentSection` a completed Builder task has already populated into
the spec's PASSION/POWER/LEGACY layout, with in-place editing — the
structured data has existed since this phase's "Save to Blueprint," it
just doesn't have a home page yet. Blueprint AI
and billing remain explicitly out of scope until their own phases.
