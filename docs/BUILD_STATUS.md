# BLUEPRINT BUILD STATUS

_Last updated: 2026-08-10 — Phase 9: Goals + Money + Progress + Accountability_

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

---

### Phase 6 — My Blueprint Business Book + Documents

**My Blueprint page**
- `/my-blueprint`: the spec's exact PASSION/POWER/LEGACY section list
  (`src/lib/blueprint/sections.ts` — the single source of truth for what
  sections exist, independent of which Builder tasks happen to populate
  them), rendered as stage tabs of section cards. Every business sees
  every spec section, whether or not a `DocumentSection` row exists for
  it yet — populated sections show real content; unpopulated ones show
  an honest empty state with a "Build \"‹task title›\"" link straight to
  the Business Builder task that will fill them in (or "add it yourself"
  when no task maps there at all).
- Gated behind `builderAccessEligible`, same as `/roadmap` and `/build` —
  My Blueprint only has content once a member starts Building.

**Auto-population (unchanged from Phase 5) + in-place editing (new)**
- "Save to My Blueprint" already upserted `DocumentSection` rows by title
  (Phase 5); this phase adds `PATCH /api/blueprint/sections` so a member
  can edit any section directly from My Blueprint — including sections no
  Builder task has ever touched. Validates the section title against the
  spec's fixed list, re-checks `assertBusinessAccess`, and upserts the
  same `(documentId, title)` row "Save to Blueprint" writes to, so a
  manual edit and a future Builder save never fight over two rows for one
  section.
- `sourceRoadmapTaskId` (which task last *auto-populated* this section) is
  left untouched by a manual edit — verified live: hand-editing "Purpose"
  after it was auto-populated from "Define Business Purpose" kept the
  "From: Define Business Purpose" provenance link, while "Edited ‹date›"
  replaced "Saved ‹date›" to reflect the more recent human edit.
- **Activity history, kept reasonable**: rather than a new audit table,
  each manual edit writes one row to the existing `AuditLog` model
  (`action: "blueprint_section_edited"`) and the section itself already
  carries `lastEditedAt` (Phase 5) — enough to show "who touched this and
  when" without a parallel history model to keep in sync.

**Document Generator**
- `src/lib/blueprint/documents.ts`: all 12 spec document types (Business
  Overview, Executive Summary, Mission and Vision, Ideal Customer
  Profile, Offer Summary, Marketing Plan, Sales Plan, Customer Journey,
  SOP, Revenue Plan, 30/60/90-Day Plan, Legacy Plan), each a pure function
  from real data — My Blueprint sections, `Business` profile fields, the
  active `Goal`, and the latest `PostSessionSummary`'s 30/60/90-day
  goals — to a renderer-agnostic `{ blocks: [{ heading, paragraphs }] }`
  structure. No AI call (spec: "structured template generation is
  acceptable"); a block with nothing to say renders "Not yet defined —
  build this in My Blueprint" instead of fabricated text.
- `/my-blueprint/documents` lists all 12 as cards; `/my-blueprint/documents/[slug]`
  renders one, generated fresh on every load (verified live: editing
  "Purpose" and reloading the Business Overview document showed the
  edited text immediately — documents are views, not snapshots).

**Download / print**
- New `(print)` route group (`src/app/(print)/`) — its own minimal
  `layout.tsx` (auth-gated, no sidebar/bottom nav) so generated documents
  and the Scorecard render as plain, chrome-free pages rather than
  fighting print CSS to hide the app shell. A shared `PrintButton` client
  component calls `window.print()`; `globals.css` gained `.no-print` /
  `.print-page` rules so the browser's own Print → Save as PDF produces a
  clean one-pager — spec's stated minimum ("at minimum generate a
  polished PDF or printable view"), with no new PDF-rendering dependency.
  Verified with a Playwright screenshot under `emulateMedia({media:
  "print"})`: the back-link/print-button bar disappears, only the
  document remains.
- Architected for DOCX later, not just described as such:
  `GeneratedDocument` is plain headings + paragraphs with zero HTML baked
  in, so a future DOCX exporter (e.g. walking blocks into the `docx`
  package's `Paragraph`/`Heading` builders) reads the exact same object
  the HTML view does — no change to `documents.ts`, just a new renderer.

**Blueprint Scorecard**
- `/my-blueprint/scorecard`: one printable page with every spec field —
  Business, Date, Passion/Power/Legacy scores, Business Health, Strength,
  Priority Gap, Current Goal, Next Best Action, Recommended Session — all
  read from the business's real latest completed assessment, active
  goal, and roadmap (`src/lib/blueprint/scorecard.ts`). A field with no
  underlying data (e.g. no active goal) renders "—", never a guess.
  Verified live against a real assessment: Passion 100% / Power 37% /
  Legacy 54% / Health 64%, Strength "Purpose (100%)", Priority Gap
  "Automation (25%)", Next Best Action "Create Mission Statement",
  Recommended Session "Blueprint Power Session" — all traceable back to
  the actual scored responses.

**Verification method**
- Live end-to-end: signed up a member, created a business, answered all
  36 assessment questions through the real autosave API, registered for
  and (as an admin account) marked ATTENDED on a session to unlock
  Builder access and generate a roadmap, then drove three real tasks
  through Save Draft → Save to Blueprint → Mark Complete via the actual
  `/api/roadmap/tasks/*` routes used by the Builder UI. Confirmed in the
  rendered HTML and via direct Postgres queries: real content appears in
  the right sections, empty sections link to the right Builder tasks,
  manual edits persist and are attributed correctly, generated documents
  reflect the latest edits, and the Scorecard's numbers match the scored
  assessment. Authorization verified: an unrelated member gets 404 from
  both the section-edit API and a document/scorecard URL for someone
  else's business; an unauthenticated request gets 401; none of these
  altered the real data. All test users/business/audit rows removed
  afterward.

---

### Phase 7 — Blueprint AI

**The rule that shaped everything else**: spec Prompt 7 opens with "Do not allow the AI to operate as a generic chatbot disconnected from the member's business." Every piece below exists to make that true — the business context block is not optional or an afterthought, it's assembled first and is always in the system prompt before the conversation even starts.

**Schema**
- New models `AiConversation` (businessId, userId, title, topic, mode, relatedTaskId) and `AiMessage` (role, content, mode, actionType, isFavorite) — additive only, migration `20260810193000_blueprint_ai`.
- AI HISTORY (spec): "Store conversations by Business, User, Topic, Related Task, Date" — all five are real columns/relations, not derived. "Favorite response," "Rename conversation," and "Continue conversation" are all real, working actions (see Verification).

**AI Context — `src/lib/ai/context.ts`**
- `assembleAiContext(businessId)` gathers, fresh on every message (never a stale cache): Business profile fields, Assessment Scores + Top Strengths/Priority Gaps, Active Goal, Completed + current Roadmap tasks, every populated My Blueprint section, and facilitator notes explicitly marked `PARTICIPANT_VISIBLE` or `RECOMMENDATION` — never a `PRIVATE` note, verified live (see below).
- "Previous AI conversations" (also spec AI CONTEXT) is handled the correct way for a chat model — as real prior turns in *that* conversation's own history, passed straight through, not summarized into this block.

**AI Modes, Actions, Safety — `src/lib/ai/modes.ts`, `actions.ts`, `system-prompt.ts`**
- All 8 spec AI MODES (Business Coach, Strategist, Copywriter, Marketing Assistant, Sales Coach, Systems Builder, Finance Guide, AI Implementation Guide) are real, switchable system-prompt framings over the same shared context — switchable mid-conversation, stamped on each message so history shows which mode produced it.
- All 9 spec AI ACTIONS buttons (Ask Blueprint AI, Help Me Answer, Improve This, Explain This, Show Me an Example, Build This With Me, Make This Simpler, Check My Work, Create a First Draft) build a real, task-specific prompt from the Builder task's title/category/why-it-matters *and the member's current, unsaved draft answers* — "Improve This"/"Check My Work" reflect what's actually in the form right now, verified live with a task that had no saved answers yet.
- Every system prompt bakes in AI RESPONSE STYLE (practical/clear/actionable/beginner-friendly/business-specific, no motivational filler, "help create an actual asset") and AI SAFETY (never claims to replace an attorney/CPA/financial adviser/licensed medical professional; must flag when professional review is needed) verbatim from the spec — not just documented intent, the literal instruction text sent to the model on every request.

**AI Client — `src/lib/ai/client.ts`**
- Calls the Anthropic Messages API directly via server-only `fetch` (no new SDK dependency) — `ANTHROPIC_API_KEY` never leaves this one function, satisfying "No sensitive keys exposed client-side" by construction, not by review.
- **Gated, graceful degradation**: no `ANTHROPIC_API_KEY` is configured in this sandbox, so every response is a clear, honest "Blueprint AI isn't fully connected... real answers will start appearing the moment a key is added" message — mirroring the Phase 1 "no email provider" pattern. Everything *around* the missing key is fully real and was verified live: conversations and messages persist correctly, context assembly runs and was inspected directly (see Verification), modes/actions/history/favoriting/renaming all work end-to-end. Adding a real key requires no code change.

**Builder integration**
- Every Business Builder task page (`/build/[taskId]`) gets a collapsible "Ask Blueprint AI about this task" panel with all 9 action buttons, a visible safety line, and a follow-up input — "Add buttons throughout Builder" (spec) means every task, not a one-off demo page.
- "Continue in Blueprint AI" links from the panel into the full `/ai` console at that exact conversation (`?conversation=<id>`), verified live to auto-select it.

**Blueprint AI console — `/ai`**
- Full chat UI: conversation sidebar (title, topic, related task, last-updated), mode selector, message thread, inline rename, favorite toggle per assistant response, "New Conversation."
- Replaces the Phase 1 `ComingSoon` placeholder; the sidebar's existing "Blueprint AI" nav entry (`/ai`) needed no changes.

**Verification method**
- Live end-to-end: signed up a member, completed a real assessment, unlocked Builder access via a real attendance flow, and started/continued real AI conversations both from the full `/ai` console and from a Builder task's action buttons (all 9 buttons individually confirmed to build the correct task-specific prompt).
- **Context correctness inspected directly**: temporarily logged the exact assembled system prompt server-side (removed before commit — see `src/lib/ai/client.ts` git history if ever needed again) and confirmed it contained this test business's real name/industry/products/ideal customer/goal, real assessment scores and top strengths/priority gaps, real roadmap tasks, a real Saved Blueprint Section ("Ideal Customer") after using Save to Blueprint, and a real `PARTICIPANT_VISIBLE` facilitator note — while a `PRIVATE` note created in the same test was confirmed absent from the context every time.
- **Isolation verified** (spec: "One user cannot access another user's context"): a second member gets 404 reading another user's conversation, 404 posting into it, an empty list filtering another user's business, and 404 starting a new conversation against a business they don't belong to; an unauthenticated request gets 401. None of these altered the real data.
- Favorite, rename, and mode-switch-mid-conversation all confirmed via direct API calls and a Playwright screenshot of the rendered console. Test users/business/conversations removed afterward.

---

### Phase 8 — Membership + Billing

**The complimentary trial starts exactly where the spec says it must**
- `ensureMembershipActivated` (`src/lib/billing/membership.ts`) is called
  from the same `markAttendance` transaction that flips
  `Business.builderAccessEligible` (Phase 3) — the free 30 days begins
  when attendance is confirmed *and* Builder activates, never at
  registration. Verified live: a fresh business's `Membership` row shows
  `trialEndsAt - trialStartsAt` = exactly 30 days, both timestamps
  matching the attendance action's own timestamp, not the earlier
  registration.
- **EXISTING MEMBER RULE, verified live**: the same business attending a
  *second* qualifying session produced no new `Membership` row and no
  change to the original trial dates — `ensureMembershipActivated` is a
  no-op once a membership already exists, full stop, regardless of
  status.

**8 membership states, all real**
- New `Membership` model (business-scoped — see Important Decisions) with
  the exact spec fields for TRIAL/COMPLIMENTARY LOGIC:
  `qualifyingSessionRegistrationId`, `attendanceConfirmedAt`,
  `activatedAt`, `trialStartsAt`, `trialEndsAt`, `convertedAt`.
  `MembershipStatus` enum: COMPLIMENTARY, ACTIVE_MONTHLY, ACTIVE_ANNUAL,
  PAYMENT_ISSUE, CANCELLED, EXPIRED, SPONSORED, ADMIN_GRANTED.
- **Correct 30-day expiration without a cron job**: `resolveEffectiveStatus`
  is a pure function computing what a membership's status *should* read
  as right now from its stored dates; `syncMembershipIfStale` lazily
  writes that back on every load (the same idempotent "ensure*" pattern
  used everywhere else in this app). Verified live: manually setting
  `trialEndsAt` to yesterday and reloading any gated page flipped the
  stored status to EXPIRED on read, with no scheduled job involved.
- **Admin-granted states**: `POST /api/admin/membership/[businessId]/grant`
  (ADMIN_ROLES only) sets SPONSORED or ADMIN_GRANTED with a required
  reason, recorded on the row (`grantedByUserId`, `grantedReason`) and in
  `AuditLog` — the spec's "Admin may manually grant promotional credit
  later" as a real, provenance-tracked action, addable from
  `/facilitator/participants`. Verified live: granting SPONSORED to an
  EXPIRED business immediately restored Builder access.

**Access gating — "Lock premium Builder functionality"**
- `getBuilderAccessState()` combines `Business.builderAccessEligible`
  (unchanged, stays true forever once earned — Known Issue #6) with
  whether the (lazily-synced) membership currently grants access.
  Applied to `/build`, `/roadmap`, `/my-blueprint`, `/my-blueprint/documents`
  (+ its print view), and conditionally to `/ai` (only once Builder was
  ever unlocked — Blueprint AI itself isn't Builder-gated, so an expired
  membership only locks it for businesses that had Builder access to
  lose). Verified live across all five surfaces after simulating trial
  expiration: every one rendered the shared `MembershipLockedNotice`
  ("Your Blueprint is saved... reactivate to keep building") instead of
  its normal content.
- `/dashboard` degrades to a distinct **EXPIRED ACCOUNT** view instead of
  locking outright — spec: "Basic Account... Session History... Read-only
  summary if appropriate." Shows read-only stage scores, the business
  name, and links to Billing/Reactivation and Session History — verified
  live via screenshot.

**Stripe integration (spec: "a proven subscription provider... server-side
secure integration")**
- `stripe` npm package, called only from server-only lib files — the API
  key never reaches the client, satisfying "no sensitive keys exposed
  client-side" by construction.
- **Checkout** (`/api/billing/checkout`): creates a Stripe Customer (once)
  and a Checkout Session for Monthly or Annual — Stripe's hosted,
  PCI-scope-free page, never touching card data directly.
- **Billing Portal** (`/api/billing/portal`): Stripe's hosted portal
  covers Update Payment and Payment History in one "proven provider" flow
  per the spec's own phrasing.
- **Cancel** (`/api/billing/cancel`): sets `cancel_at_period_end` on the
  Stripe subscription and flips local status to CANCELLED immediately —
  access continues (`membershipGrantsAccess` includes CANCELLED) through
  `currentPeriodEndsAt`, exactly the spec's "allow access through current
  paid billing period." Nothing about the business's Blueprint content is
  touched.
- **Reactivate** (`/api/billing/reactivate`): un-cancels a still-alive
  subscription in place, or — if the subscription actually ended —
  starts a fresh Checkout Session at the same plan, with no new trial
  (`ensureMembershipActivated` is never re-invoked).
- **Webhook** (`/api/billing/webhook`): `Stripe.webhooks.constructEvent`
  signature verification (a static method needing only
  `STRIPE_WEBHOOK_SECRET`, no API key) plus a `StripeWebhookEvent`
  idempotency table, both required before any event is trusted. Handles
  `customer.subscription.created/updated` (the single source of truth for
  ACTIVE_MONTHLY/ACTIVE_ANNUAL/PAYMENT_ISSUE/CANCELLED — a Stripe-Portal-
  initiated cancellation is recognized via `cancel_at_period_end`, not
  just our own Cancel button), `customer.subscription.deleted` (→
  EXPIRED), `invoice.paid`/`invoice.payment_failed` (writes a real
  `MembershipInvoice` row either way — Payment History — and flips
  PAYMENT_ISSUE on failure without touching anything else), and
  `payment_method.attached` (the one event whose payload includes full
  card details inline, so it's the only place payment-method display
  fields sync without an extra Stripe API call).

**Verified live, gated by no `STRIPE_SECRET_KEY`**
- No live Stripe key is configured in this sandbox, so real
  checkout/portal/cancel/reactivate all return a clear "Billing isn't
  connected in this environment yet" (503) instead of crashing — same
  graceful-degradation pattern as Blueprint AI (Phase 7) and email (Phase
  1). **Bug found and fixed by this phase's own live testing**: the four
  billing action routes originally checked `isStripeConfigured()` before
  `assertBusinessAccess`, so an unrelated user's request short-circuited
  to a 503 ("not connected") instead of a 404 — meaning an unauthorized
  caller could still learn the environment's billing-configuration state,
  and worse, the authorization check silently never ran in a sandbox like
  this one. Reordered so authorization is always checked first,
  regardless of what else is or isn't configured — re-verified live
  afterward (an unrelated member now gets a flat 404 from all four
  routes).
- **Webhook signature verification and the full state machine were
  verified fully offline**, since `Stripe.webhooks.constructEvent` and
  its test-signing counterpart both need only the shared webhook secret,
  not a live API key: a script signed six synthetic events with Stripe's
  own `generateTestHeaderString` and posted them to the real route,
  confirming — via direct Postgres queries — past_due → PAYMENT_ISSUE,
  cancel_at_period_end + active → CANCELLED, subscription.deleted →
  EXPIRED, a failed invoice recording a FAILED `MembershipInvoice` row
  and flipping PAYMENT_ISSUE, a paid invoice recording a PAID row, a
  payment method's brand/last4/exp syncing from `payment_method.attached`,
  a redelivered event id being deduped (`{"deduped": true}`, no double
  apply), and a bad signature being rejected with 400.
- Authorization isolation verified: an unrelated member gets 404 from
  checkout/portal/reactivate for a business they don't own, and 403 from
  the admin grant route.

**Pricing & Billing pages**
- `/pricing` (public, `(marketing)`): exact spec copy and numbers —
  "First 30 days free with a qualifying session," $9.99/month,
  $100/year, "Save approximately 17%" — verified against
  `src/lib/billing/pricing.ts`'s computed constants ($19.88 / 16.58%→17%
  rounded), not hand-typed twice.
- `/billing` (authenticated): Current Plan, Status, Trial End (when
  COMPLIMENTARY), Next Billing Date / Access Through (when
  ACTIVE_*/CANCELLED), Amount, Payment Method, Payment History, and the
  right action buttons for the current status (subscribe, Update
  Payment, Change Plan, Cancel, Reactivate) — verified live via
  screenshot showing a real Visa card, a PAID and a FAILED invoice with
  receipt links, and Status "Expired."
- `/billing/return`: Checkout's `success_url` lands here — a brief
  "confirming" beat before redirecting to the real Billing page, so the
  webhook has a moment to land first.

---

### Phase 9 — Goals + Money + Progress + Accountability

**Goals — 5 cadences × 9 types, all real**
- `Goal` gained `cadence` (`GoalCadence`: WEEKLY, MONTHLY, NINETY_DAY,
  QUARTERLY, ANNUAL — default NINETY_DAY, unchanged for pre-Phase-9
  rows), `goalType` (`GoalType`: REVENUE, PROFIT, LEADS, CUSTOMERS,
  LAUNCH, MARKETING, SYSTEMS, TEAM, PERSONAL_CEO), and `targetValue`/
  `unit` (kept as `Float`/`String`, not cents, since a goal can target
  dollars, leads, or customers). Verified live across four goals spanning
  every axis (Weekly Revenue $2,000, 90-Day Personal CEO "fewer than 40
  hrs/week," Annual Team "hire a full team," Monthly Leads 25) — each
  rendered with correct cadence/type badges and, where numeric, the
  right target/unit on `/goals`.

**Revenue Planner and Pricing Builder — real math, not AI-guessed**
- `calculateRevenuePlan` (`src/lib/money/revenue-planner.ts`): Revenue
  Goal, Offer Price, Conversion Rate, Working Weeks → Sales Needed
  (`ceil(goal / price)`), Leads Needed (`ceil(sales / conversion)`),
  Weekly Target (`goal / workingWeeks`), Monthly Target
  (`weeklyTarget × 52/12`). Verified live against a hand-calculation
  ($1,200 goal / $100 price / 20% conversion / 48 weeks →
  salesNeeded=12, leadsNeeded=60, weeklyTarget=$25.00,
  monthlyTarget=$108.33) — exact match.
- `calculatePricingPlan` (`src/lib/money/pricing-builder.ts`): Offer,
  Delivery Time, Direct Costs, Desired Profit, Capacity →
  `targetPrice = directCosts + desiredProfit / capacity`, then a ±15%
  band as the estimated sustainable range, plus a $/hour framing and a
  capacity-shortfall warning. The considerations text spells out, per
  spec, that this is **not a guaranteed market price** — it's a
  cost-plus sustainability floor, not a market-validated number.
  Verified live ($20 costs + $2,000 profit / 20 capacity → $120 target →
  $102.00–$138.00 range, $60/hr framing at 2hr delivery) — exact match.
- Both calculators save their result (`RevenuePlan`, `PricingPlan`,
  business-scoped) so a member's last calculation is there next time,
  not just a one-off compute-and-forget.

**Weekly CEO Check-In**
- The spec's exact 8 fields: What did you complete, What slowed you
  down, Biggest win, Biggest challenge, Leads, Sales, Revenue, What
  needs attention next week. One `WeeklyCheckIn` row per
  `(businessId, weekOf)` (Monday-anchored via `getWeekStart`), upserted
  — resubmitting the same week updates in place rather than creating a
  duplicate. Verified live: submitting the same week twice left exactly
  one row (same `id`, `updatedAt` changed) via direct SQL.
- Copy is deliberately non-punitive ("There's no penalty for missing a
  day" sits right above the form) — same spirit as Accountability's
  required "do not shame" language below.

**Monthly Review — built entirely from real stored data**
- `getMonthlyReview()` computes all nine spec-required sections from
  actual rows, nothing fabricated: Roadmap progress (from `RoadmapTask`
  status counts), Score changes (current completed `Assessment` vs. the
  previous completed one — see Important Decisions for why this is
  assessment-to-assessment, not same-month), Business Health change,
  active Goals, Leads/Sales/Revenue (summed from that month's
  `WeeklyCheckIn` rows), Achievements (`BusinessMilestone` rows earned
  that month), Current Bottleneck (reuses Phase 2's
  `topStrengthsAndPriorities`), and Recommended Focus (highest-priority
  NOT_STARTED roadmap task, linked straight to `/build/[taskId]`).
  Verified live via screenshot showing real numbers throughout: "August
  2026," 10% Roadmap Complete, 12 Leads, 3 Sales, $6,500 Revenue,
  Current Bottleneck "Impact (50%)," Recommended Focus correctly linked,
  and 6 real Achievements listed.

**Reassessment — eligibility, retake, and a real Previous-vs-Current comparison**
- `getReassessmentEligibility()`: eligible after
  `REASSESSMENT_DAYS = 90` since the last completed assessment, OR at
  `REASSESSMENT_ROADMAP_PERCENT = 50`% roadmap completion — whichever
  comes first, matching the spec's "after 90 days OR substantial
  roadmap completion." `POST /api/assessment/retake` re-checks
  eligibility server-side (never trusts the client) before calling the
  existing (Phase 2) `getOrCreateActiveAssessment(..., { forceNew: true })`.
  **Verified fully live, not just read from code**: backdated a real
  completed `Assessment.completedAt` by 91 days via direct SQL, reloaded
  `/progress`, and confirmed the page itself now read *"It's been 91
  days since your last assessment. You're eligible to see how far you've
  come."* Called the real retake API, answered all 36 questions of the
  new assessment through the real autosave endpoint (each `SCALE_1_5`
  answer bumped up from the first assessment's to produce an honest
  improvement) and completed it through the real completion endpoint.
  The Reassessment tab then rendered a real **Previous vs. Current**
  comparison computed from the two actual completed assessments: Passion
  50%→75% (+25), Power 58%→79% (+21), Legacy 54%→77% (+23), Business
  Health 54%→77% — and eligibility correctly re-locked (back to "0 so
  far") now that the most recent assessment is fresh.

**15 Milestones — auto-detected from real signals, self-attested only where undetectable**
- `MilestoneKey` enum, all 15 from the spec: Mission Defined, Ideal
  Customer Defined, First Offer, Pricing Complete, First Lead System,
  First Customer, First $1K, First $5K Month, First $10K Month, First
  SOP, First Automation, First Contractor, First Employee, CEO Mode,
  Legacy Builder. `checkForNewMilestones()` runs after every Blueprint
  section save (both the automatic Save-to-Blueprint path and a manual
  edit) and after every Weekly Check-in — never fabricated, only ever
  derived from Blueprint section content presence or real cumulative/
  monthly revenue and sales figures already in the database.
- **Verified live**: completing the real "Define Business Purpose,"
  "Define Ideal Customer," and "Create Mission Statement" Builder tasks
  auto-achieved Mission Defined and Ideal Customer Defined with
  `source: "auto"`. A single $6,500/3-sale Weekly Check-in correctly
  auto-achieved First Customer, First $1K, and First $5K Month in the
  same pass, and correctly did **not** achieve First $10K Month (since
  $6,500 < $10,000). Manually marking First Employee via
  `POST /api/progress/milestones/FIRST_EMPLOYEE/achieve` succeeded with
  `source: "manual"`; attempting to manually mark the auto-detectable
  Mission Defined the same way correctly returned 400 ("is
  auto-detected, not self-reported") — `markMilestoneManually()` only
  accepts the four milestones the catalog itself marks
  `autoDetectable: false` (First Contractor, First Employee, CEO Mode,
  Legacy Builder).

**Accountability — cadence choice with no shame-based messaging**
- 2/3/5 days per week or Custom (`Business.accountabilityCadence`/
  `accountabilityCustomDays`), set from `/progress`. Copy reads "How
  often do you want to show up here? There's no penalty for missing a
  day" — never a streak counter or a missed-day warning, per spec ("Do
  not shame missed days").
- **Welcome Back banner, verified live with a real elapsed gap**: the
  page reads `Business.lastActiveAt` *before* updating it on the same
  load (`isWelcomeBack()`, gap threshold `WELCOME_BACK_GAP_DAYS = 5`).
  Backdated `lastActiveAt` by 10 days via direct SQL, reloaded
  `/progress`, and confirmed the rendered banner reads exactly *"**Welcome
  back.** Let's continue where you left off."* — the spec's literal
  copy.

**Dashboard integration**
- New Milestones card (achieved count / total, three most recent, quick
  links to Progress and Money) and a Goal Snapshot card showing the
  business's active goal's real progress — both added to the existing
  `getDashboardData()` bundle in `src/lib/dashboard/data.ts` alongside
  the Phase 8 EXPIRED ACCOUNT branch (unchanged this phase). New "Money"
  nav item added alongside the existing sidebar/bottom-nav items.

**Verification method**
- Live end-to-end throughout, not code review: a full test business
  (Quill Consulting) taken through assessment completion, session
  attendance/Builder unlock, three real Builder task completions, all
  four Goal combinations, both calculators, a check-in submitted twice
  (upsert proof), milestone auto-detection and manual marking, an
  accountability cadence change, the full 91-day-backdated reassessment
  → retake → real second assessment → real score comparison flow above,
  and the 10-day-backdated Welcome Back banner — all confirmed via
  direct Postgres queries and six Playwright screenshots (Weekly
  Check-In, Monthly Review, Milestones, Reassessment, Goals, Dashboard).
- **Authorization isolation verified live**: a freshly signed-up user
  with no business membership at all got 404 from Check-in, Revenue
  Planner, Pricing Builder, Milestone-achieve, Accountability, and
  Assessment Retake for the test business, and 403 from Goal creation
  (matching that route's pre-existing Phase 4 pattern) — the same
  "unrelated caller gets a flat denial" boundary every prior phase
  establishes. All test data (business, three test users, the
  second/retake assessment) removed afterward.

## IN PROGRESS

- Nothing left mid-implementation from Phase 1 through 9. Every prompt in the current build sequence (1–9) is complete.

## NOT STARTED

- Resources library, Progress page's "story" narrative (both still
  `ComingSoon` placeholders — Prompt 9 gave Progress its check-in/review/
  milestone/reassessment content but not a "story" narrative view, which
  the spec never actually defined beyond the section heading).
- Admin/Facilitator functionality beyond role-gated placeholder shells,
  the participant view, and the roadmap control page built in Phase 5
  (no admin UI yet to edit `AssessmentScoringConfig`, create
  `SessionOffering`s, or assign `FacilitatorAssignment`s directly).
- Transactional email (see Known Issues) — Billing is now implemented (Phase 8).
- A member-facing view of their own Post-Session Summary.
- Per-stage roadmap sub-pages — Stage Progress cards all link to the one
  `/roadmap` page rather than a stage-scoped view (spec says "each opens
  respective roadmap"; simplified to one page showing every stage).
- A real DOCX export — only the printable/PDF path is implemented; see
  Important Decisions for why `documents.ts` is already shaped to add one
  without a rewrite.

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
   automatically, no migration needed. Both remain freely hand-editable
   from My Blueprint in the meantime (Phase 6) — "no task populates it
   yet" only means no Builder task fills it in *automatically*.
10. **`prisma migrate dev` doesn't work in this non-interactive
    environment** (it wants a TTY to confirm destructive-looking
    warnings, e.g. new unique constraints on empty tables). Every Phase 5
    migration was generated with `prisma migrate diff --script` and
    applied with `prisma migrate deploy` instead — same resulting SQL,
    just without the interactive confirmation step. Worth trying
    `prisma migrate dev` directly in a normal terminal in later phases.
11. **PDF generation is the browser's, not the server's.** "Download" is
    a print-CSS'd HTML page plus `window.print()` → Save as PDF, not a
    server-rendered PDF file — meets the spec's stated minimum without a
    new rendering dependency (headless Chromium, `pdfkit`, etc.), but
    there's no server-side "email me the PDF" path yet since there's no
    file being produced server-side to attach.
12. **Documents regenerate on every view; nothing is saved as a
    named/versioned artifact.** `/my-blueprint/documents/[slug]` always
    reflects the business's current data, which is the correct behavior
    for "always current" but means there's no "documents I've generated
    before" history — only My Blueprint's own edit history exists.
13. **No `ANTHROPIC_API_KEY` is configured in this sandbox.** Every
    Blueprint AI response is the honest "not connected yet" message (see
    Phase 7's client.ts) rather than a real model response — the entire
    surrounding system (context assembly, modes, actions, conversation
    persistence, history, favoriting, renaming, Builder integration,
    authorization) is fully built and was verified live around that one
    gap. Set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) in
    `.env` to turn real responses on — no code change needed.
14. **Blueprint AI has no per-user or per-business rate limiting.** Fine
    at this scale/for this sandbox; worth adding before real API costs
    are on the line.
15. **A conversation's "topic" is free text set once at creation**, not
    editable after the fact the way title is — spec only lists "Rename
    conversation" as an action, not "re-topic," so this was left as
    intentionally out of scope rather than guessed at.
16. **No `STRIPE_SECRET_KEY` (or a real `STRIPE_WEBHOOK_SECRET`) is
    configured in this sandbox.** Real checkout/portal/cancel/reactivate
    all return a clear 503 instead of working — the entire surrounding
    system (trial activation, 30-day expiration, access gating, the
    webhook's signature verification and full event-driven state
    machine, Payment History, the admin grant path) was fully built and
    verified live around that one gap, the same pattern as Blueprint AI
    (Phase 7) and email (Phase 1). A local-only test `STRIPE_WEBHOOK_SECRET`
    was used to verify webhook signature handling offline via Stripe's
    own `generateTestHeaderString` helper (no live key needed for that
    specific check) — see `docs/BUILD_STATUS.md` Phase 8 summary.
17. **Stripe Price ids (`STRIPE_PRICE_ID_MONTHLY`/`STRIPE_PRICE_ID_ANNUAL`)
    must be created in the Stripe Dashboard and set as env vars before
    real checkout works** — nothing here can create them programmatically
    (a Price is tied to a Product, which is a one-time dashboard/API setup
    step, not a per-checkout action).
18. **No plan proration UI.** "Change Plan" routes through Stripe's
    Billing Portal, which handles proration on a plan switch itself —
    there's no custom in-app "switch to annual" flow with its own
    proration math to get wrong.
19. **Payment Method display fields only sync from `payment_method.attached`.**
    If a customer's default payment method changes through some other
    path Stripe supports but this integration doesn't listen for, the
    Billing page's "Payment Method" could show stale brand/last4 until
    the next `payment_method.attached` fires. Doesn't affect the
    subscription's actual billing — only that one display field.
20. **Monthly Review's Score Change compares assessment-to-assessment,
    not calendar-month-to-calendar-month.** If a member completes their
    only assessment in August and reassesses in November, November's
    Monthly Review shows that improvement — but August through October's
    reviews show no change at all, since there's only ever one completed
    assessment to compare against until a reassessment exists. See
    Important Decisions for why this was chosen over a same-month delta.
21. **Milestone auto-detection runs synchronously inside the check-in and
    Blueprint-save request**, not as a background job. Fine at this
    scale (a handful of cheap existence/threshold queries per save); a
    business with a very large Blueprint or check-in history could see
    this add measurable latency to those specific requests before it
    would to anything else.
22. **Reassessment's 90-day and 50%-roadmap thresholds are fixed
    constants** (`REASSESSMENT_DAYS`, `REASSESSMENT_ROADMAP_PERCENT` in
    `src/lib/progress/reassessment.ts`), not per-business configurable.
    Matches the spec's flat numbers; revisit if a future phase needs
    these tunable per plan or per business.
23. **No UI yet to browse *all* past assessments, only the two most
    recent (Previous vs. Current).** A member who reassesses more than
    once has no in-app history view of every completed assessment — only
    the latest comparison. The underlying data (every completed
    `Assessment` row) is retained, so this is a UI gap, not a data one.

## DATABASE CHANGES

- New migration:
  `prisma/migrations/20260810210000_goals_money_progress_accountability`
  — purely additive.
  - New enums `GoalCadence` (5 values), `GoalType` (9 values),
    `MilestoneKey` (15 values).
  - `Goal`: added `cadence` (default `NINETY_DAY`, so existing rows stay
    valid), `goalType` (default `PERSONAL_CEO`), `targetValue` (`Float?`),
    `unit` (`String?`).
  - New models: `RevenuePlan` (businessId, revenueGoalCents,
    offerPriceCents, conversionRatePercent, workingWeeks, and the four
    computed results — salesNeeded, leadsNeeded, monthlyTargetCents,
    weeklyTargetCents — stored alongside the inputs, not recomputed on
    every read), `PricingPlan` (businessId, offerName,
    deliveryTimeHours, directCostsCents, desiredProfitCents,
    capacityPerMonth, estimatedLowCents, estimatedHighCents,
    considerations), `WeeklyCheckIn` (businessId, userId, weekOf with a
    `@@unique([businessId, weekOf])` for the upsert-by-week behavior, the
    8 spec fields), `BusinessMilestone` (businessId, milestone,
    achievedAt, source — "auto" or "manual" — with a
    `@@unique([businessId, milestone])` so `checkForNewMilestones()` can
    safely `createMany({ skipDuplicates: true })`).
  - `Business`: added `accountabilityCadence` (`String?`),
    `accountabilityCustomDays` (`Int?`), `lastActiveAt` (`DateTime?`).
  - Money fields (`RevenuePlan`, `PricingPlan`, `WeeklyCheckIn`) are
    integer cents throughout, matching the Phase 8 convention; `Goal`
    kept `targetValue` as `Float` since goals span both money and plain
    counts (leads, customers) and forcing everything into cents would
    make non-money goals nonsensical.
- New migration: `prisma/migrations/20260810200000_membership_billing` —
  new enums `MembershipStatus` (8 values), `MembershipPlan`,
  `InvoiceStatus`; new models `Membership` (businessId unique, status,
  plan, the spec's trial/complimentary fields, Stripe linkage, payment
  method display fields, cancellation fields, admin-grant provenance),
  `MembershipInvoice` (Payment History), `StripeWebhookEvent` (webhook
  idempotency). Also **drops the unused Phase 1 `Subscription` model**
  (User-scoped, never wired to anything, explicitly a placeholder) in
  favor of the business-scoped `Membership` design the spec actually
  calls for — no data existed to migrate.
- New migration: `prisma/migrations/20260810193000_blueprint_ai` — new
  enums `AiMode` (8 values) and `AiMessageRole`; new models
  `AiConversation` (businessId, userId, title, topic, mode,
  relatedTaskId → `RoadmapTask`, `onDelete: SetNull`) and `AiMessage`
  (conversationId, role, content, mode, actionType, isFavorite). Purely
  additive — no existing table touched.
- **Phase 6: no schema migration.** Every model this phase needed
  (`Document`, `DocumentSection` with `lastEditedAt`/`sourceRoadmapTaskId`,
  `AuditLog`) already existed from Phase 1/5 — My Blueprint, the Document
  Generator, and the Scorecard are all built entirely on data phases 1–5
  already had a home for.
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

## IMPORTANT DECISIONS (Phase 6 additions)

- **"Products" and "Services" are one My Blueprint section, not two.**
  Prompt 6 lists them separately, but Phase 5's task library defines a
  single Builder task ("Finalize Products and Services") for both —
  they're one cohesive offer definition for a small business. Binding two
  separately-editable UI sections to the same underlying data would let
  editing one silently overwrite the other, so they're presented as one
  section, "Products & Services," instead. Documented here rather than
  quietly diverging from the spec's list.
- **The section registry (`src/lib/blueprint/sections.ts`) is the source
  of truth for My Blueprint's layout — not the set of `DocumentSection`
  rows that happen to exist.** A business always sees all 32 spec
  sections; content is either real or an honest empty state, never
  inferred from "whatever rows exist." This is what makes an unedited,
  un-Built section ("Technology," "Impact," or any section a member just
  hasn't gotten to) look like an invitation rather than a bug.
- **Manual edits never clear `sourceRoadmapTaskId`.** A section's
  provenance ("From: ‹task›") is a record of the last *automated*
  population, which stays true and useful even after a human polishes
  the wording — clearing it on every hand-edit would make the provenance
  link disappear the moment anyone touched their own content.
- **Print, not a PDF library.** Chose the browser's native Print → Save
  as PDF over adding a server-side PDF renderer (`puppeteer`, `pdfkit`,
  etc.). It meets the spec's literal minimum ("at minimum generate a
  polished PDF or printable view"), needs zero new dependencies or fonts
  to keep in sync with the design system, and print CSS + a dedicated
  chrome-free `(print)` route group was enough to make it "polished."
  Revisit only if a requirement appears for a document to exist as a
  file server-side (e.g. to email or archive).
- **`GeneratedDocument` is headings + paragraphs, not HTML.** Keeping the
  Document Generator's output renderer-agnostic (`documents.ts` has zero
  knowledge of Tailwind classes or JSX) is what makes "architect for
  DOCX later" true rather than aspirational — a DOCX renderer is a
  peer to the HTML one, not a rewrite of the data layer.
- **Activity history reuses `AuditLog` instead of a new model.** Prompt
  6 says "keep activity history where reasonable" — a general-purpose
  audit table that already exists (and already has `entityType`/
  `entityId`/`metadata`) is a reasonable amount of history for a manual
  edit; a parallel section-specific history table would duplicate what
  `AuditLog` + `DocumentSection.lastEditedAt` already cover.

## IMPORTANT DECISIONS (Phase 7 additions)

- **Anthropic called via raw `fetch`, not the `@anthropic-ai/sdk`
  package.** Exactly one function (`callBlueprintAi` in
  `src/lib/ai/client.ts`) ever needs it; a server-only `fetch` call gives
  the same "key never leaves the server" guarantee with zero new
  dependencies to keep patched.
- **A missing/failed AI call degrades to a message, never an error
  page.** Same shape as the Phase 1 "no email provider" decision: the
  conversation, the message, and the context that *would* have been sent
  are all real and saved either way — only the model's reply is a stand-
  in. This is what let every other Phase 7 acceptance-checklist item
  (context correctness, isolation, history, Builder integration) be
  verified live in this sandbox despite no key being configured.
- **AI conversations are owned by exactly one user, no staff override.**
  Every other business-scoped model in this app (roadmap, Blueprint
  sections, goals) is readable by an assigned facilitator/admin; AI
  conversations deliberately are not — `loadOwnedConversation` checks
  `conversation.userId === callerId` only. The spec's own acceptance
  checklist says "one user cannot access another user's context," and a
  private chat log is exactly the kind of data where a staff-access
  carve-out could be too easily misread as "of course a facilitator can
  read this."
- **"Facilitator-approved notes where appropriate" = `PARTICIPANT_VISIBLE`
  and `RECOMMENDATION` note types only**, never `PRIVATE` (obviously) and
  never `TASK_RECOMMENDATION` — that type is an internal signal the
  roadmap engine already consumes (Phase 5), not text written for a
  member to read verbatim from an AI response.
- **The 9 AI Actions build their prompt from the Builder form's live,
  unsaved `answers` state, not the last-saved `TaskResponse`.** "Improve
  This" and "Check My Work" only mean something if they see what the
  member is looking at right now — passing `answers` down from
  `TaskBuilderForm` into `AiPanel` was the one piece of state-lifting
  Phase 7 needed, in an otherwise fully server-rendered page.
- **One shared `assembleAiContext()`, called fresh on every message, not
  cached on the conversation.** A business's assessment scores, roadmap,
  or Blueprint sections can change between messages in a long-running
  conversation; re-assembling context every time is the only way the AI
  is never reasoning from stale data — the small extra query cost is
  worth that guarantee.

## IMPORTANT DECISIONS (Phase 8 additions)

- **Membership is scoped to the Business, not the User.** Builder access
  itself is already business-scoped (`Business.builderAccessEligible`),
  and the spec's EXISTING MEMBER RULE ("a paid member attending another
  session gets no new trial") only makes sense against one membership
  per business to check — not one per user who happens to attend, which
  would let a second team member attending a session accidentally start
  a second free trial for the same business.
- **Access gating is two independent flags, not one.**
  `builderAccessEligible` means "this business has ever earned Builder
  access" and never changes once true (unchanged from Phase 3/Known Issue
  #6); `Membership` status means "does that access currently apply."
  Keeping them separate means an expired trial never has to pretend the
  business never attended its session — the dashboard's EXPIRED ACCOUNT
  view can still show real read-only assessment data precisely because
  `builderAccessEligible` stays true.
- **30-day expiration and post-cancellation access-through-period-end are
  computed lazily, not via a scheduled job.** `resolveEffectiveStatus` +
  `syncMembershipIfStale` is the same idempotent "ensure*" pattern this
  app already uses for content seeding and roadmap generation — the
  status is only ever stale between someone's page loads, and it
  self-corrects on the very next one. No cron infrastructure needed for
  "correct 30-day expiration" to be true.
- **`customer.subscription.updated` (not `checkout.session.completed`) is
  the single source of truth for plan/status/period.** A Checkout Session
  event's payload doesn't include the subscription's line items inline;
  rather than making the webhook handler perform an extra
  `subscriptions.retrieve` API call, subscription events (which Stripe
  fires for the initial purchase *and* every renewal *and* every
  cancellation, from either our button or Stripe's own portal) carry
  everything needed inline. One handler, no extra network round-trip,
  and every kind of subscription change — not just the first one — goes
  through the identical code path.
- **`cancel_at_period_end` is read before Stripe's raw subscription
  status when mapping to a local `MembershipStatus`.** Otherwise a
  cancellation initiated from Stripe's own Billing Portal (bypassing our
  in-app Cancel button entirely) would still show as ACTIVE_* until the
  period actually ended, silently disagreeing with what Stripe itself
  would tell the member.
- **Stripe's hosted Checkout + Billing Portal over custom card UI.**
  Meets "prefer a proven subscription provider... server-side secure
  integration" literally, keeps this app entirely out of PCI scope (no
  Stripe Elements, no card fields ever rendered here), and gives Update
  Payment / Payment History / Change Plan proration all "for free" from
  one hosted flow rather than three custom ones.
- **Authorization is checked before the Stripe-configured check, in every
  billing route — found and fixed during this phase's own testing** (see
  Phase 8 COMPLETE summary). The general lesson generalizes past Stripe:
  any "is this feature configured" gate must never sit ahead of "is this
  caller allowed to do this" in the same handler, or an unconfigured
  sandbox silently stops exercising authorization at all.

## IMPORTANT DECISIONS (Phase 9 additions)

- **Score Change in Monthly Review compares the current completed
  Assessment against the previous completed Assessment, not a
  same-calendar-month delta.** Most members will have exactly one
  completed assessment for a long time (reassessment is gated behind 90
  days or 50% roadmap completion — it's not a monthly event), so a
  "change since last month" framing would show "no change" for months on
  end even while real Builder progress is happening. Comparing against
  the previous *assessment* means the number only moves when there's a
  real, deliberate reassessment behind it — documented as Known Issue #20
  since it does mean the same review can repeat unchanged across several
  calendar months.
- **`RevenuePlan`/`PricingPlan` persist their computed outputs, not just
  their inputs.** Both `POST` routes calculate and save in one call
  (`salesNeeded`, `leadsNeeded`, the target cents, the estimated range)
  rather than storing only the raw inputs and recomputing on every read.
  Slightly more storage for a guarantee that what a member saw when they
  last calculated is exactly what's shown next time, even if the
  calculation formula itself is refined in a later phase.
- **Milestone auto-detection re-runs on every Blueprint save and every
  Weekly Check-in, using `createMany({ skipDuplicates: true })` against a
  `(businessId, milestone)` unique constraint** — the same idempotent
  "ensure*"-family pattern this app uses everywhere else (roadmap
  generation, membership activation), rather than a one-time check at
  task-completion time. A milestone whose trigger condition was already
  true before Phase 9 shipped (e.g. an existing business already past
  $5K in a check-in from before Milestones existed) gets picked up
  correctly the very next time any of its trigger paths run, with no
  backfill script needed.
- **Self-attested milestones are exactly the four the spec itself
  flags as undetectable from data this app has** (First Contractor,
  First Employee, CEO Mode, Legacy Builder) — everything else always
  goes through auto-detection, never a manual override, even though the
  API technically could allow it. `markMilestoneManually()` enforces this
  by checking `MILESTONE_CATALOG`'s own `autoDetectable` flag rather than
  trusting the caller, so "which milestones can be self-reported" stays
  defined in exactly one place.
- **Reassessment's "Previous vs. Current" always compares the two most
  recent completed assessments, not a member-chosen pair.** Simplest
  reading of the spec's "show Previous/Current/Improvement" — there's no
  requirement to compare arbitrary historical points, and a full
  assessment-history browser is flagged as Known Issue #23 for a later
  phase rather than guessed at here.
- **Accountability cadence is a plain string + optional int
  (`accountabilityCadence`, `accountabilityCustomDays`) on `Business`,
  not a new enum-backed model.** The spec's four choices (2/3/5
  days/week or Custom) are a single preference with no history or
  audit-trail requirement attached — a whole new table would be
  over-modeling one field.
- **`isWelcomeBack()` reads `Business.lastActiveAt` *before* the same
  request updates it, then updates it unconditionally afterward** — the
  same "compute from what was true a moment ago, then correct forward"
  shape as `resolveEffectiveStatus`/`syncMembershipIfStale` in Phase 8,
  just applied to a single timestamp instead of a full status machine.
  It's also why the extracted top-level `isWelcomeBack()` function (not
  inline in the component body) was the fix for the `react-hooks/purity`
  lint error here, mirroring the pre-existing `greeting()` helper in
  `dashboard/page.tsx`.

## NEXT RECOMMENDED PHASE

No further numbered prompt has been received yet. Prompts 1–9 are all
complete; what's left is flagged by earlier phases as out of scope rather
than part of any numbered prompt so far:

- **Admin content tooling** — `AssessmentScoringConfig`,
  `SessionOffering`, `FacilitatorAssignment`, and now
  `AssessmentQuestion` seed content are all currently editable only via
  direct DB writes in test scripts; an admin UI is the natural next home
  for all of them.
- **Resources library** and a real **Progress page "story" narrative** —
  the Resources nav item is still a `ComingSoon` placeholder, and Phase 9
  gave Progress its check-in/review/milestone/reassessment content but
  never defined what a "story" narrative view would show beyond that.
- **A real `ANTHROPIC_API_KEY`** and **real Stripe keys** (`STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, and two Price ids) in whatever environment
  this deploys to, to turn Phase 7/8's fully-built integrations from
  graceful-degradation messages into real AI responses and real payments.
- **An automated test suite** (Known Issue #3, unchanged since Phase 2)
  — every phase through 9 has been verified live against a real Postgres
  database instead of a checked-in suite; formalizing the verification
  scripts this build sequence has already been running into real
  regression tests would be valuable before further phases build on top
  of this much surface area.
- **A full assessment-history browser** (Known Issue #23) — only the two
  most recent completed assessments are ever compared; a member who
  reassesses multiple times has no in-app view of every past result.
