# BLUEPRINT BUILD STATUS

_Last updated: 2026-08-13 — Personalized Vision Board & Blueprint Generator: implementation complete_

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

---

### Phase 10 — Advanced Business Tools

Eight new business-scoped tools, all gated behind the same Builder-access
check as Money/Progress (`getGatedBusinessContext`) — none required a
schema change to anything that existed before this phase; every model is
purely additive (`prisma/migrations/20260810220000_advanced_business_tools`).

**Lightweight CRM — `/tools/crm`**
- New `Lead` model with the spec's exact tracked fields (Name, Business,
  Email, Phone, Offer, Value, Stage, Next Action, Notes) and the 7-stage
  `LeadStage` enum (New Lead → Contacted → Qualified → Proposal →
  Follow-Up → Won/Lost). The page groups leads by stage with a live
  Open Pipeline / Won value summary computed from real `valueCents`, not
  hand-typed numbers. Verified live: created a lead, moved it through a
  stage change via `PATCH`, confirmed the summary cards and stage
  grouping updated correctly, then removed it via `DELETE`.

**Customer Journey Builder — `/tools/journey`**
- New `JourneyStage` model. Every business is lazily seeded with the
  spec's exact 9 default stages (Awareness → Lead → Nurture →
  Consultation → Purchase → Onboarding → Delivery → Retention →
  Referral) the same "ensure*"-on-first-visit pattern used everywhere
  else in this app (`ensureJourneyStagesSeeded`) — verified live via
  direct SQL showing all 9 rows in the correct order on first load.
  Fully customizable after that: renamed a stage inline, added a custom
  10th stage, swapped its order with an existing stage via the shared
  up/down `ReorderButtons` control, then deleted it — all verified live.

**SOP Builder — `/tools/sops`**
- New `Sop` model with the spec's exact 9 fields (Name, Purpose, Trigger,
  Owner, Tools, Steps, Completion Criteria, Exceptions, Review Date).
  `Steps` is stored as one-step-per-line free text — an SOP is read as a
  document, not driven by app logic. Verified live: created a full SOP
  and confirmed every field round-tripped correctly, including the
  formatted multi-line Steps block.

**Automation Mapper — `/tools/automation`**
- New `AutomationStep` model with the spec's exact fields (Trigger,
  Action, Tool, Timing, Owner, Message, Next Step) plus an `order`
  column. "Allow visual sequence" is met by rendering steps as a
  connected chain (a colored icon + connector line between cards,
  mirroring the master spec's own Roadmap chain visual) with the same
  shared `ReorderButtons` control as Customer Journey. Verified live:
  created two chained steps (order 0, 1, auto-incrementing), confirmed
  both render connected in sequence.

**Offer Builder — `/tools/offers`** (the one Phase 10 tool with a spec-mandated
My Blueprint side effect)
- New `Offer` model with the spec's exact fields (Name, Audience,
  Problem, Outcome, Features, Benefits, Deliverables, Price, CTA) plus
  `savedToBlueprintAt`. Creating an offer automatically upserts My
  Blueprint's existing "Products & Services" section (the same
  `blueprintDestination` the Phase 5 "Finalize Products and Services"
  Builder task already targets) via a new general-purpose
  `upsertBlueprintSection()` added to `src/lib/roadmap/blueprint.ts` —
  no manual step required, though a manual "Save to My Blueprint" button
  (`POST /api/tools/offers/[id]/save-to-blueprint`) also exists so a
  member can pick which of several saved offers is their current live
  one. **Verified live and directly in Postgres**: created an offer,
  confirmed `savedToBlueprintAt` was set in the same response, then
  queried `DocumentSection` directly and confirmed the "Products &
  Services" row's `content` exactly matches the offer's formatted
  fields, `stage = POWER`, `sourceRoadmapTaskId = null` (correctly
  distinguishing this from a roadmap-task-driven save) — then confirmed
  it renders on the real `/my-blueprint` page. As a side effect (through
  the same `checkForNewMilestones` call every Blueprint-section write
  already triggers), saving an offer correctly auto-achieved the
  pre-existing Phase 9 "First Offer" milestone — verified live via the
  Dashboard's Milestones card.

**Marketing Plan Builder — `/tools/marketing-plan`**
- New `MarketingPlan` model with the spec's exact 8 fields (Goal,
  Audience, Channels, Content Pillars, Lead Magnet, Campaign, CTA,
  Metrics). Verified live: created a full plan, confirmed every field
  round-tripped and rendered correctly.

**Sales Script Builder — `/tools/scripts`**
- New `SalesScript` model and `SalesScriptType` enum for the spec's
  exact 6 types (Discovery Call, Sales Call, DM Response, Follow-Up,
  Objection Handling, Closing). "Generate/store" is met the same way
  Phase 6's Document Generator met "generate a document" — a structured
  starter template per type (`src/lib/tools/script-templates.ts`), no AI
  call — selecting a type pre-fills the script text, which the member
  then edits and saves as their own. Verified live: created a Discovery
  Call script from its template and confirmed it saved and rendered with
  a truncated preview on its card.

**Content Planner — `/tools/content-planner`**
- New `ContentPlanItem` model with `ContentCadence`
  (Daily/Weekly/Monthly) and `ContentStatus`
  (Idea/Drafted/Scheduled/Posted) enums, plus the spec's Platform and CTA
  fields, grouped by cadence on the page. Verified live: created an idea,
  changed its status via the inline quick-select control (Idea →
  Drafted), confirmed the change persisted and rendered.

**Tools hub, navigation, and Dashboard integration**
- `/tools` hub page links all 8 tools with real descriptions; new "Tools"
  sidebar/nav entry (between Money and Resources) and proxy matcher
  entry, following the exact pattern of every gated route added in
  Phases 8–9.
- Dashboard gained a new "Advanced Tools" card (real open-lead count and
  open pipeline value, computed the same way the CRM page computes its
  own summary — no separate/divergent calculation) with quick links to
  CRM, Offer Builder, and the full Tools hub. Verified live via
  screenshot showing "1 open lead in your pipeline — $1500 potential"
  matching the real test lead created that session.

**Verification method**
- Live end-to-end, not code review: a full test business (Patel Design
  Studio) taken through Builder access unlock, one lead through a real
  stage change, the full default Customer Journey plus a custom
  add/rename/reorder/delete cycle, a complete SOP, two chained
  Automation steps, an Offer (with its real My Blueprint sync verified
  directly in Postgres and on the live My Blueprint page), a Marketing
  Plan, a Sales Script from its template, and a Content Planner item
  with a real status change — all confirmed via direct API calls, direct
  Postgres queries, and eleven Playwright screenshots covering the hub,
  all 8 tool pages, My Blueprint, and the Dashboard.
- **Authorization isolation verified live**: a freshly signed-up user
  with no business membership at all got 404 from every create, update,
  and delete endpoint across all 8 tools (leads, journey stages, SOPs,
  automation steps, offers, offer-save-to-blueprint, marketing plans,
  scripts, content items) for the test business, and the outsider's
  `/tools/crm` page load rendered only the generic "unlocks after your
  Blueprint Session" notice — confirmed no real lead data was present in
  that response. All test data (business, two test users, the
  assessment/roadmap rows added to unlock the dashboard's Builder view)
  removed afterward.

---

### Phase 11 — Facilitator + Admin Command Center

**Facilitator Dashboard — `/facilitator`**
- Replaces the old link-out stub with a real compact table of every
  assigned participant: Business, Current Stage (the weakest-scored
  stage, mirroring the assessment's own recommendation logic), Passion/
  Power/Legacy/Health, Last Activity, Current Task, Current Goal, Session
  Attended, and a "Potentially Stalled" flag — every field a real query,
  computed once in a new shared `getParticipantSummaries()`
  (`src/lib/facilitator/participants.ts`) so this list and the
  Participant Detail page below can never disagree with each other.
- **"Current Task" reuses the Dashboard's own `nextBestAction` logic**
  (highest-priority NOT_STARTED task) — a facilitator never sees a
  different "next" than the member does.
- **Stalled detection**: a business is flagged only once it has Builder
  access, still has incomplete roadmap tasks, *and* nobody has engaged
  with the app in `STALLED_DAYS = 14` days — never flagged pre-session,
  since there's nothing to stall yet.
- Authorization reuses (and both the old participants list and this new
  dashboard now share) one extracted `getFacilitatorBusinessIds()`: an
  admin sees every business with a session registration; a facilitator
  sees only businesses they're assigned to (`FacilitatorAssignment`) or
  that registered for a session they personally run.

**Participant Detail — `/facilitator/participants/[businessId]`**
- New page consolidating everything the spec asks for in one place:
  Assessment (scores, top strengths/priorities), Roadmap (status counts +
  recently completed, linking to the existing Phase 5 Manage Roadmap
  page for the editing actions), My Blueprint (section-fill count, no
  raw content dumped), Goals, Sessions (with attendance control), Progress
  (check-in count, milestones, accountability cadence), Recent Activity
  (real AI conversations + completed tasks), Facilitator Notes (full
  history + the existing NoteForm), Send Encouragement, and — for
  admins — Grant Membership.

**Facilitator Actions (spec: 8 actions)**
- **Assign Task, Reorder Roadmap, Unlock Task, Pause Task, Set
  Priority** were already fully built in Phase 5 (`AddTaskForms` +
  `RoadmapControls` at `/facilitator/participants/roadmap/[businessId]`)
  — linked from the new Detail page rather than rebuilt.
- **Add Note** reuses the existing Phase 3 `NoteForm`/`FacilitatorNote`
  pipeline, now embedded in the Detail page.
- **Recommend Session** (new): a dropdown of real, currently-`SCHEDULED`
  `SessionOffering`s — never free text — that writes a real
  `FacilitatorNote` (type `RECOMMENDATION`). Because that note type
  already feeds Blueprint AI's context and the roadmap generator's
  facilitator-boost logic (Phases 5 & 7), a session recommendation is
  immediately visible in both places too, for free.
- **Send Encouragement** (new): the first real writer for the Phase 1
  `Notification` model, which sat completely unused until this phase.
  Creates a `Notification` for every member of the business — not a note
  only staff can see — surfaced on a new `NotificationsCard` folded into
  the member Dashboard's shared header (so it shows in every dashboard
  state, including EXPIRED), with a dismiss action that marks it read.

**Admin Dashboard — `/admin`**
- Replaces the `ComingSoon` placeholder with real aggregate metrics
  (`src/lib/admin/metrics.ts`, one `Promise.all` batch): Users,
  Assessments Started/Completed, Session Registrations/Attendance,
  Builder Activations, Active/Monthly/Annual Members, Task Completion %,
  average Roadmap Progress %, and Passion/Power/Legacy/Business Health
  averages computed from each business's *latest* completed assessment
  only (a business that reassessed doesn't count twice).

**Funnel — `/admin/analytics`**
- Real counts for every spec stage (Signup → Assessment Started/
  Completed → Session Registered/Attended → Builder Activated → First
  Task Completed → 30-Day Active → Paid Conversion), rendered as
  proportional bars. **"Session Viewed" is honestly shown as "Not
  tracked"** rather than a fabricated number — this app has no
  page-view analytics infrastructure, and every other metric in this
  build has been real from Phase 1 onward; this one stage doesn't get an
  exception.

**Admin Users — `/admin/users`**
- Real user list with a role-change control. **Only a Super Admin may
  grant Admin or Super Admin itself** — a plain Admin can still manage
  Member/Facilitator/Implementation Specialist — closing a
  privilege-escalation hole a flat "any admin can grant any role" rule
  would have opened. Verified live in both directions.

**Admin Sessions — `/admin/sessions`**
- Real list of every `SessionOffering` (title, type, format, start time,
  registered/capacity, facilitator) with a status control, plus a Create
  Session form (title, type, format, description, start time, capacity,
  facilitator).

**Admin Assessments — `/admin/assessments`**
- **Assessment Questions**: all 36 questions, grouped by stage, each
  inline-editable (prompt text, active toggle, scoring weight).
- **Scoring Thresholds** (spec: "Thresholds can be modified"): a real
  form editing `AssessmentScoringConfig`'s `stageThresholds` (drives
  which session gets recommended) and `excellenceThreshold` (drives the
  GROWTH-session override) — the exact two fields that model's own doc
  comments call out as the configurable ones. `stageWeights`/
  `statusBands` stay visible but read-only this phase (see Known
  Issues).

**Admin Content — `/admin/content`**
- **Task Templates** (also *is* the Roadmap Template — a business's
  roadmap is generated directly from this library, so there's no
  separate model to edit): active toggle + inline `whyItMatters` edit,
  grouped by stage.
- **Resources**: full create/toggle/delete on the previously-unused
  Phase 1 `Resource` model.
- **Milestones**: the 15-milestone catalog shown read-only — it's
  code-defined (each key is referenced directly by the Phase 9
  auto-detection engine), so "editing" it here would silently desync
  from what the app actually checks; see Important Decisions.
- **AI Prompt Templates** (new `AiPromptTemplate` model, one row per
  `AiMode`): admin can override any of the 8 modes' system-prompt
  framing. `buildSystemPrompt()` (Phase 7) now checks for an active
  override before falling back to the hardcoded default — purely an
  override layer, never a second source of truth.
- **Programs** (new `Program` model): a named catalog a `SessionOffering`
  can optionally belong to (`SessionOffering.programId`, nullable) —
  admin-managed now, and the attachment point Prompt 12's
  Organization-level Programs will use later without another migration.

**A richer, safer "last active" signal**
- The Facilitator Dashboard's "Last Activity" and the funnel's "30-Day
  Active" use a new `getRealLastActivityBulk()`
  (`src/lib/facilitator/activity.ts`) — the max of `Business.lastActiveAt`
  and the most recent real roadmap-task update, AI conversation, or
  weekly check-in for that business. **Deliberately does not broaden
  what writes to `Business.lastActiveAt` itself** — that column stays
  scoped to Progress-page visits/check-ins exactly as Phase 9 defined it,
  because Progress's "Welcome Back" banner depends on reading that
  column's *previous* value before the current visit overwrites it;
  widening the write path (e.g. from the shared app layout) would make
  every visit look "fresh" by the time Progress reads it, silently
  breaking Welcome Back. This was caught and reverted during this
  phase's own implementation — see Important Decisions.

**Verification method**
- Live end-to-end, not code review: two facilitators (one assigned, one
  not) and an admin against a real test business — confirmed the
  unassigned facilitator sees "No participants yet," gets a 404 loading
  the business's Detail page directly, and gets 403 posting a note to
  it, while the assigned facilitator sees exactly the right real
  numbers (hand-verified against direct SQL: Passion 70/Power 55/Legacy
  60/Health 62, Current Task "Create Mission Statement," Current Goal,
  Current Stage badge = POWER as the weakest score). Recommend Session
  and Send Encouragement both verified end-to-end — the encouragement
  Notification appeared on the real member Dashboard, was dismissible,
  and disappeared after being marked read via a real `PATCH`. Every
  Admin Overview metric and every Funnel stage count was hand-verified
  against direct SQL/counts before and after creating test data. Role
  management, session creation, assessment-question edits, scoring
  threshold edits, task-template edits, resource/program creation, and
  the AI prompt override were all exercised via real API calls and
  confirmed to persist on reload — then restored to their original
  values (the real seed content was never left altered). Confirmed via
  screenshot that the mobile Facilitator Dashboard and the member
  Dashboard's notification card both render correctly at a 390px
  viewport. All test users/business/sessions/resources/programs removed
  afterward.
- **Authorization boundaries verified live in both directions**: a
  facilitator (not admin) got 403 from every admin-only route (user role
  change, session create, task-template edit) tested; an Admin (not
  Super Admin) got 403 attempting to grant Admin; a Super Admin's own
  grant of a lower role succeeded.

**PHASE 12 — Organizations + Cohorts + Future Scale**

- **Organization Accounts** (`/admin/organizations`, platform admin
  only) — create an organization with a `type` (9 spec values: Nonprofit,
  School, College, Government Program, Chamber, Incubator, Veteran
  Program, Women's Entrepreneurship Program, Corporate Program, Other).
  The creator is automatically granted an `OrganizationMembership` with
  `role: "ADMIN"` for that org, so a platform admin who spins one up can
  immediately manage it from the org side too, not just the admin list.
- **Organization Dashboard** (`/organization/[id]`, `/organization`
  landing list) — any org member (any role) or platform admin can view;
  only an org ADMIN or platform admin sees the management forms (Add
  Staff, Create Cohort, Sponsor Access, Branding & Privacy). Shows
  Cohorts, Sponsored Seats, Staff, and Training Sessions
  (`SessionOffering.organizationId`, already modeled since Phase 3, now
  has a real reader).
- **Cohorts** (`/organization/[id]/cohorts/[cohortId]`) — create, edit
  (name/status/description), and assign/remove participants by email
  (resolved server-side to a `Business` via a small lookup endpoint —
  see Important Decisions). Every tracked stat (Participants, Sessions
  Attended, Roadmap Completion, Business Health, Active-in-14-days,
  Milestones Achieved) is a live query against the cohort's member
  businesses (`src/lib/organizations/cohort-analytics.ts`) — nothing is
  stored on the `Cohort` row itself, matching this schema's "no fake
  analytics" rule since Phase 4.
- **Sponsored Access** — an org ADMIN sponsors a participant's Blueprint
  access by email; `sponsorBusiness()` upserts the same `Membership` row
  Phase 8's admin-grant flow uses (`status: "SPONSORED"`), recording
  `sponsorOrganizationId` and an optional `sponsoredUntil`.
  `resolveEffectiveStatus()` (Phase 8) was extended with one new branch:
  a `SPONSORED` membership whose `sponsoredUntil` has passed lazily
  transitions to `EXPIRED` the next time it's read — gated strictly on
  `sponsoredUntil` being non-null, so Phase 8's existing (never-expiring)
  admin-granted `SPONSORED` flow is completely unaffected. Verified live
  by backdating a test sponsorship's `sponsoredUntil` and confirming the
  lazy transition fired on the next page load, then re-checking the
  status in Postgres.
- **Organization Analytics** (`/organization/[id]/analytics`) — aggregate
  numbers (Participants, Assessment Completion, Session Attendance,
  Roadmap Completion, Business Health + stage averages, Health
  Improvement, Businesses Launched, Milestones) always render; a
  participant-by-participant table (reusing Phase 11's
  `getParticipantSummaries()`) only renders when
  `Organization.allowIndividualParticipantData` is true — off by
  default. Verified live: the table was absent with the flag off,
  appeared with real names/emails the moment it was flipped on via the
  Branding & Privacy form, matching the spec's "aggregate by default,
  individual only with permission" requirement exactly.
- **Impact Report** (`/(print)/organization/[id]/impact-report`) —
  reuses the Phase 6 `(print)` route group and `PrintButton` pattern
  (browser print → Save as PDF). Reports Participants Served, Training
  Sessions, Assessment Improvement, Business Milestones, Businesses
  Launched, Systems Built (real signal: Phase 10's SOP + Automation Step
  count), Jobs Created (sum of a new self-reported Business field), and
  optional Revenue Growth (sum of `WeeklyCheckIn.revenueCents`).
  Participant Confidence has no tracked signal anywhere in this schema
  and is shown honestly as "Not tracked" — the same convention Phase
  11's funnel used for "Session Viewed."
- **`Business.jobsCreatedSelfReported`** — a new optional whole-number
  field on the Business Profile form ("Leave blank if unsure"), summed
  into any organization's Impact Report the business is a cohort member
  or sponsored participant of.
- **White-Label Readiness** — `Organization` gained `logoUrl`,
  `primaryColor`, `secondaryColor`, `customDomain`, `brandedFromName`,
  `brandedFromEmail`. Stored and displayed (the org dashboard renders
  the logo) but `customDomain` has no routing/DNS behind it and
  `brandedFromName`/`brandedFromEmail` aren't wired into an email sender
  (there still isn't one — Known Issue #1) — architected per the spec's
  explicit "do not fully implement domain infrastructure" instruction.
- **Organization isolation** — `assertOrganizationAccess()` mirrors the
  existing `assertBusinessAccess()` pattern: a platform admin can manage
  any org; anyone else needs a real `OrganizationMembership` row for
  *that specific* organization, and every resource route 404s (never
  403s) on a mismatch, matching this app's "never leak existence"
  convention since Phase 10. Verified live in both directions: an
  outsider user with no membership in the test organization got 404 on
  the org dashboard, the cohort detail page, and every mutating API
  route (create cohort, sponsor), while the org's own delegated ADMIN
  (a non-platform-admin user, added by email through the Staff form)
  successfully created a cohort, added a participant, and sponsored a
  business through the exact same endpoints.
- **Existing individual (non-org) members are unaffected** — verified
  live: a `Membership` created the ordinary Phase 8 way (no
  `sponsorOrganizationId`, no `sponsoredUntil`) is untouched by the new
  `resolveEffectiveStatus()` branch, and a business with no
  `CohortMembership`/sponsorship never appears in any organization's
  participant count or analytics.
- **Verification method**: live HTTP + direct Postgres, not code review.
  Created a real organization as a platform admin, added a second user
  as that org's own ADMIN by email, and drove cohort creation,
  email-based participant assignment, and sponsorship entirely through
  that delegated org-admin account (not the platform admin) to prove the
  non-platform-admin path actually works end to end. Every Analytics/
  Impact Report number was hand-verified: 2 participants (1 cohort
  member + 1 sponsored, correctly deduplicated by the union in
  `getOrganizationBusinessIds()`), Jobs Created = 3 + 1 = 4 matching the
  two test businesses' self-reported values. Confirmed via screenshot
  that the org dashboard, cohort detail, analytics, and impact report
  all render correctly at a 390px mobile viewport. `npm run build` and
  `npm run lint` both pass clean. All test users/businesses/organization
  removed afterward.

**LAUNCH HARDENING — Ultra Pre-Publish Audit fixes**

Not a numbered spec prompt — a self-directed audit (`BLUEPRINT ULTRA
PRE-PUBLISH AUDIT`, scored 82/100 / Grade B / "NOT READY — FIX
REQUIRED", zero critical blockers) was run against Phases 1–12, and this
closes its "Top 10 Launch Risks" list.

- **Session registration capacity race (HIGH, closed).** The read-count
  → decide → write in `registerForSession()`
  (`src/lib/sessions/qualification.ts`) used to be three separate
  queries with no lock between them — two people registering for the
  last seat at the same instant could both read `activeCount < capacity`
  as true and both land REGISTERED, overbooking the session. Now runs
  inside one `Serializable`-isolation interactive transaction with a
  retry loop on Postgres's own conflict error (`P2034`) — the DB itself
  now makes overbooking structurally impossible instead of relying on
  application-level timing. Verified live: a capacity-1 session correctly
  gave the first registrant REGISTERED and the second WAITLISTED
  (position 1).
- **No rate limiting anywhere (HIGH, closed).** New DB-backed
  `checkRateLimit()` (`src/lib/rate-limit.ts` — a `RateLimitHit` row per
  attempt, no Redis/new infra needed) wired into signup, login (keyed
  per-email inside NextAuth's `authorize()`), forgot-password,
  reset-password, and both Blueprint AI message endpoints (bounds
  provider spend once a real key exists). Verified live: the 6th signup
  attempt from one IP inside the window returned `429`.
- **No transactional email / password reset unusable in production
  (HIGH, closed).** New `src/lib/email/send.ts` sends real email via
  Resend's REST API (`RESEND_API_KEY`/`EMAIL_FROM`) with the same
  graceful-degradation shape as AI/Stripe when unconfigured. Verified
  live end-to-end with no key set: forgot-password logged the
  would-have-sent message, returned a dev-only reset link, the link
  reset the password, and the new password logged in successfully.
  (A real `RESEND_API_KEY` was provisioned in a later pass and
  live-verified sending an actual email through this same route —
  see Known Issue #1.)
- **No legal pages / no support surface (HIGH, closed).** Added
  `/terms`, `/privacy`, `/refund-policy` (real, feature-specific drafted
  content — pricing, the 30-day trial, sponsored access, AI/Blueprint
  AI's non-professional-advice status, org data-sharing — **not
  boilerplate placeholder text, but also not a substitute for a licensed
  attorney's review before a real launch**), linked from the marketing
  footer and the signup form's consent line. Added a full Support
  surface: `/support` (member-facing, send a message + see your own
  request history) → `SupportRequest` row → optional email to
  `SUPPORT_EMAIL` + a confirmation email to the requester →
  `/admin/support` (staff inbox, mark Open/Resolved). Verified live:
  create as one user, invisible to another, visible and resolvable by an
  admin.
- **No error monitoring (MEDIUM, closed, self-hosted).** New `ErrorLog`
  model + `logError()` (`src/lib/observability/log-error.ts`) — no
  third-party account needed, consistent with this app's "the DB can
  already do this" pattern. Wired into the Stripe webhook's failure path
  and both Blueprint AI failure branches; a new `src/app/error.tsx` +
  `src/app/global-error.tsx` client boundary pair report via
  `POST /api/observability/log` (a Client Component can't reach Prisma
  directly). `/admin/errors` lists the most recent 100 — "how would a
  support person diagnose this without database surgery" now has an
  answer. Verified live: a reported client error appeared in the DB and
  rendered on the admin page.
- **`NEXTAUTH_URL` silently falling back to localhost (MEDIUM, closed).**
  `forgot-password` now refuses to send a reset email (500, logged)
  rather than mailing a broken `localhost:3000` link if `NEXTAUTH_URL` is
  unset in production — fails loudly instead of silently, per the audit
  finding.
- **Mobile matrix broadened + one real bug found and fixed.** Re-ran the
  Playwright mobile check across 320/375/430/768/1024px (previously only
  390px had been checked) on every public marketing/legal page plus two
  authenticated pages. Found a real overflow at 320px: the marketing
  header's "Start My Blueprint" button pushed 16px past the viewport
  edge. Fixed with a shorter "Start" label below the `sm` breakpoint
  (`src/app/(marketing)/layout.tsx`) — re-verified zero horizontal
  overflow across the full matrix afterward.
- **Automated test suite (MEDIUM, partially closed) — see revised Known
  Issue #3.**
- ~~Not fixable by this pass — needs real credentials, not code~~
  **Since resolved:** real `STRIPE_SECRET_KEY`/`ANTHROPIC_API_KEY`/
  `RESEND_API_KEY` are all now provisioned in `.env` and live-verified —
  see Known Issues #1, #13, #16, #17. Every surrounding system (webhook
  signature verification + idempotency, trial state machine, AI context
  assembly, the new email/error/rate-limit infrastructure) was built and
  verified around that gap, the same pattern as every prior phase — and
  real checkout, real AI answers, and real email delivery are now
  themselves live-verified too, not just the surrounding system.
- ~~Deliberately not attempted this pass: full-field editing on the 8
  Phase 10 tools~~ **Since built (Known Issue #24 — RESOLVED).** See the
  "Second Follow-Up Pass" section below.
- **Verification method**: live HTTP + direct Postgres (rate-limit
  429s, full password-reset round trip, session capacity/waitlist
  behavior, support request isolation + admin resolution, error-log
  round trip), `npm run build`/`npm run lint`/`npm test` all clean, a
  broadened live mobile matrix via Playwright (installed and removed
  again afterward, per this project's established pattern) that caught
  and confirmed the fix for one real bug. All test data removed
  afterward.

**SECOND FOLLOW-UP PASS — remaining items from the audit's "Should Fix" /
"Optional Polish" checklist**

Not a numbered spec prompt — user-directed closure of five specific,
named items still open after the credential-verification pass: full-field
editing on the 8 Phase 10 tools (Known Issue #24), a keyboard/screen-reader
accessibility pass, the reorder endpoint's atomicity (Known Issue #26),
`robots.txt`/`sitemap.xml`, and expanding the test suite past pure
functions.

- **Full-field editing on all 8 Phase 10 tools (Known Issue #24,
  closed).** One shared, generic `EditToolModal`
  (`src/components/tools/edit-tool-modal.tsx`) — a Radix `Dialog`-based
  form driven by a small per-tool field-spec array (text/textarea/money/
  select) — instead of eight bespoke edit forms, the same "one shared
  component" pattern `DeleteButton` already established. 4 of the 8
  tools (SOP, Offer, Marketing Plan, Sales Script) had a fully-built
  `update*Schema` in `src/lib/validations/tools.ts` that no route ever
  actually used — their `PATCH` handlers didn't exist at all, only
  `DELETE`; those four routes were added. The other 4 (Leads, Automation,
  Content Planner, Journey) already had `PATCH`, just no full-field UI —
  only a quick stage/status/rename control. `SalesScript`'s `type` field
  was also added to `updateSalesScriptSchema` (it was create-only before).
  Verified live: created and then PATCHed every field of one record per
  tool (all 8) directly against the running app, including SOP's
  `reviewDate` string→Date conversion and cross-tenant 404s on a second
  test business — all correct.
- **Atomic reorder endpoint (Known Issue #26, closed).** New
  `POST /api/tools/journey/reorder` and `POST /api/tools/automation/reorder`
  swap two rows' `order` values inside one `prisma.$transaction([...])`
  instead of the old `ReorderButtons`' two independent, non-atomic PATCH
  calls. `ReorderButtons` now takes just `{ reorderEndpoint, id, prevId,
  nextId }` and POSTs the pair to swap — simpler than the old order-value
  props, not just safer. Verified live: a real swap on both tools, plus
  the negative cases — a cross-business pair and a stranger's reorder
  attempt both return `404`, not `403` (no existence leak).
- **Keyboard + screen-reader accessibility pass (closed).** Ran axe-core
  (via a temporary Playwright install, removed afterward) against
  `/signup`, `/login`, `/dashboard`, and both assessment states (welcome
  screen and mid-question) with a real authenticated session, plus a
  keyboard-only Tab-order trace on each. Found and fixed 3 real
  violations: a `text-navy-400` `text-xs` label on the assessment welcome
  screen that fell just under the 4.5:1 contrast ratio (`text-navy-400`
  vs. white computes to ~4.55:1 — right at the edge, and fails against
  this app's actual off-white surface color), the same pattern on
  `ProgressHeader`'s "Question X of Y" label, and the assessment's
  `role="progressbar"` element having no accessible name. Fixed all
  three, then proactively swept every other `<ProgressBar>` call site
  missing an accessible name (dashboard's stage-progress and goal-
  snapshot bars, `/progress`'s goal list, `/goals`' goal list) since
  they're the same component and the same bug class — added an
  `ariaLabel` prop to `ProgressBar` for this. Re-ran the full scan after:
  zero violations across all 5 pages/states. Keyboard trace found no real
  focus-trap or invisible-focus issue on any actual page element (the one
  "no visible focus indicator" stop on every page was Next.js's dev-mode
  overlay portal, not present in a production build). Not chased further:
  `text-navy-400` is used ~80 more times app-wide, mostly on larger/bold
  text or decorative icons where it isn't a violation — a full sitewide
  sweep was out of scope for "signup, assessment, and dashboard."
- **`robots.txt` / `sitemap.xml` (closed).** `src/app/robots.ts` and
  `src/app/sitemap.ts` (Next.js's file-convention metadata routes).
  `robots.txt` disallows every authenticated surface (`/api/`,
  `/dashboard`, `/tools`, `/admin`, etc.) plus `/forgot-password` and
  `/reset-password` specifically (the latter carries a one-time token in
  its query string and must never be indexed); `/login` and `/signup`
  stay crawlable. `sitemap.xml` lists only the truly public pages: `/`,
  `/pricing`, `/login`, `/signup`, `/terms`, `/privacy`,
  `/refund-policy`. Both use the same `NEXTAUTH_URL` base-URL convention
  as email links and Stripe redirects. Verified live at
  `http://localhost:3100/robots.txt` and `/sitemap.xml`.
- **Automated test suite expanded to route/integration coverage (Known
  Issue #3, further resolved).** New `vitest.integration.config.mts` /
  `npm run test:integration` — same aliasing trick as the unit config for
  `server-only`, but deliberately does NOT mock `@/lib/prisma`, so these
  15 tests run against the real local Postgres database (`DATABASE_URL`),
  not stubs. Covers: `assertBusinessAccess` (6 cases — owner access,
  cross-tenant denial, facilitator assignment, admin override, all
  against real `User`/`Business`/`UserBusinessMembership` rows);
  `checkRateLimit` (3 cases — limit enforcement, key isolation, window
  expiry via a backdated row, no real sleep needed); the session-capacity
  race itself (2 cases, the marquee one — two REAL concurrent
  `registerForSession()` transactions racing for a capacity-1 seat,
  re-queried from the DB afterward to confirm exactly one `REGISTERED`
  row and one `WAITLISTED` at position 1, automating what was previously
  a manual live-HTTP script); and the actual
  `POST /api/tools/automation/reorder` route handler end-to-end (4 cases
  — 401 unauthenticated, a real atomic swap, and two 404 authorization
  cases), imported and called directly rather than reimplemented, with
  only `getCurrentUser` stubbed via `vi.mock` (identity resolution) while
  `assertBusinessAccess` runs for real. Deliberately kept separate from
  `npm test` (excluded via each config's `include`/`exclude`) since it
  needs a live database and mutates real rows — `npm test` stays fast and
  hermetic. All fixture rows use a per-run timestamp suffix and are
  cleaned up in `afterAll`; verified zero leftover rows after a clean
  run.
- **Verification method**: same as every prior pass — `npm run
  build`/`npm run lint`/`npm test`/`npm run test:integration` all clean,
  live HTTP + direct Postgres round trips for every new/changed route
  (created and PATCHed a real record for all 8 tools, swapped real
  reorder pairs, hit the new static routes), a real axe-core +
  keyboard-trace scan (Playwright installed and removed again
  afterward), and a second test business used to confirm cross-tenant
  isolation on the new endpoints. All test data removed afterward.

## IN PROGRESS

- Nothing left mid-implementation. Every prompt in the current build sequence (1–12) is complete — Prompt 12 was the last numbered prompt.

## NOT STARTED

- Resources library, Progress page's "story" narrative (both still
  `ComingSoon` placeholders — Prompt 9 gave Progress its check-in/review/
  milestone/reassessment content but not a "story" narrative view, which
  the spec never actually defined beyond the section heading).
- Transactional email (see Known Issues) — Billing is now implemented (Phase 8).
- A member-facing view of their own Post-Session Summary.
- Per-stage roadmap sub-pages — Stage Progress cards all link to the one
  `/roadmap` page rather than a stage-scoped view (spec says "each opens
  respective roadmap"; simplified to one page showing every stage).
- A real DOCX export — only the printable/PDF path is implemented; see
  Important Decisions for why `documents.ts` is already shaped to add one
  without a rewrite.
- ~~Full-field editing for the 8 Phase 10 tools~~ **RESOLVED — see the
  "Second Follow-Up Pass" section.** At the time this phase shipped, each
  tool supported Create, Read, Delete, and (for CRM/Content Planner) a
  quick stage/status change, matching the spec's literal acceptance
  language ("saves"/"works") rather than a stated editing requirement —
  see Important Decisions for that original reasoning.
- Full editing of `stageWeights`/`statusBands` on the admin Scoring
  Thresholds form — only `stageThresholds`/`excellenceThreshold` are
  editable this phase (see Phase 11 summary above).
- Session-level page-view analytics ("Session Viewed" in the funnel) —
  no tracking infrastructure exists for this yet; honestly shown as "Not
  tracked" rather than guessed at.
- Real custom-domain routing and branded-email delivery behind Phase
  12's White-Label fields — stored/displayed only, see Phase 12 summary.
- A dedicated admin UI to create/edit `FacilitatorAssignment`s directly
  (Known Issue #28) — Phase 12 gave organizations a real admin UI, but
  facilitator-to-business assignment outside an organization context is
  still a direct DB write.

## KNOWN ISSUES

1. ~~No email provider~~ **RESOLVED (Launch Hardening) — credential provisioned
   and live-verified.** `src/lib/email/send.ts` sends real email via
   Resend's REST API; with no key configured it still degrades
   gracefully to a log line (same pattern as AI/Stripe) rather than
   silently failing. A real `RESEND_API_KEY` + `EMAIL_FROM` are now set
   in `.env` (gitignored, never committed) and were verified live twice:
   a direct call to `POST https://api.resend.com/emails` returned `200`
   with a real message id, and driving the app's own
   `POST /api/auth/forgot-password` route for a real signed-up test user
   produced a genuine `PasswordResetToken` row with no "not configured"
   log line and no `ErrorLog` entry — confirming the full app pathway
   sends, not just the raw provider call. `forgot-password` and Support
   confirmations both use it.
2. **`next-auth@4` / `@auth/core` advisories** — unchanged from Phase 1,
   not reachable by the Credentials-only setup in use.
3. ~~No automated test suite~~ **PARTIALLY RESOLVED (Launch Hardening).**
   `npm test` (Vitest) now covers the highest-risk pure logic hand-traced
   during the Ultra Pre-Publish Audit — assessment scoring/recommendation
   (all 4 spec scenarios + exact threshold boundaries), membership status
   resolution (every `resolveEffectiveStatus` transition), and pricing
   constants — 31 tests, no DB required. Everything that touches
   Prisma/Postgres is still verified live only, the same as every phase
   through 12 was verified with a real Postgres
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
13. ~~No `ANTHROPIC_API_KEY` is configured in this sandbox~~ **RESOLVED —
    credential provisioned and live-verified.** A real `ANTHROPIC_API_KEY`
    is now set in `.env` (gitignored, never committed). Verified live: a
    real model response came back that was demonstrably grounded in a
    specific, distinctive test business profile (not generic boilerplate),
    a coherent follow-up message continued the same conversation, and
    cross-user conversation isolation was re-confirmed with the real key
    in place. Context assembly, modes, actions, conversation persistence,
    history, favoriting, renaming, Builder integration, and authorization
    were already fully built; this closes the one remaining gap.
14. **Blueprint AI has no per-user or per-business rate limiting.** Fine
    at this scale/for this sandbox; worth adding before real API costs
    are on the line.
15. **A conversation's "topic" is free text set once at creation**, not
    editable after the fact the way title is — spec only lists "Rename
    conversation" as an action, not "re-topic," so this was left as
    intentionally out of scope rather than guessed at.
16. ~~No `STRIPE_SECRET_KEY` (or a real `STRIPE_WEBHOOK_SECRET`) is
    configured in this sandbox~~ **RESOLVED — credentials provisioned and
    live-verified end to end.** A real `STRIPE_SECRET_KEY` is set in
    `.env` (gitignored, never committed). A real Checkout Session was
    created through the app's own `/api/billing/checkout` route and
    independently confirmed via Stripe's own API as genuinely `open`
    with the correct `amount_total`. Webhook signature verification was
    then closed out for real: the Stripe CLI (built from source via
    `go install`, since binary release downloads were blocked by this
    session's repo scoping) was used to `listen`/`trigger`/`events resend`
    real, live-signed webhook events at the running app — 7/7 accepted
    with valid signatures, idempotency proven against a genuine Stripe
    redelivery (not a synthetic replay), and the negative case (bad
    signature → `400`) confirmed. `STRIPE_WEBHOOK_SECRET` in `.env` is
    the CLI's forwarding secret and is only valid while `stripe listen`
    is running; production should use the secret from a real Dashboard
    (or `stripe listen`) webhook endpoint instead.
17. ~~Stripe Price ids must be created in the Stripe Dashboard~~
    **RESOLVED.** `STRIPE_PRICE_ID_MONTHLY` and `STRIPE_PRICE_ID_ANNUAL`
    were created programmatically via the Stripe API (a Product plus two
    Prices — $9.99/mo and $100/yr, matching the pricing page exactly) and
    are set in `.env`.
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
24. **The 8 Phase 10 tools support Create/Read/Delete (+ quick stage or
    status change for CRM and Content Planner), not full in-place editing
    of every field.** To fix a typo in a saved SOP, Offer, Marketing
    Plan, Automation step, or Script today, a member deletes and
    re-creates it. Deliberate scope line for this phase — see Important
    Decisions — revisit if member feedback asks for it.
25. **The Automation Mapper's "Next Step" is free text, not a real link
    to the next step in the sequence.** The spec's fields (Trigger,
    Action, Tool, Timing, Owner, Message, Next Step) describe one step
    each; "Allow visual sequence" is met by chaining `AutomationStep`
    rows by `order` with a connected visual (see Important Decisions),
    but nothing parses "Next Step" text back into an actual relation to
    another row — it's a human-readable note, same as the spec shows it.
26. ~~The Customer Journey Builder and Automation Mapper's up/down
    reorder swaps two rows' `order` values with two sequential PATCH
    calls, not a single atomic operation~~ **RESOLVED — see the "Second
    Follow-Up Pass" section.** `POST /api/tools/journey/reorder` and
    `POST /api/tools/automation/reorder` now swap both rows inside one
    `prisma.$transaction([...])`, and `ReorderButtons` calls the new
    endpoint instead of issuing two independent PATCHes.
27. **Offer Builder's My Blueprint sync always targets a single
    "Products & Services" section — saving a second offer overwrites
    what the first one wrote.** This matches the existing My Blueprint
    model (one section per title) and the spec's framing of "the"
    business's offer; a business that wants to track several distinct
    offers side-by-side sees them all listed on `/tools/offers`, but only
    the most recently saved (or manually re-saved) one is reflected in
    My Blueprint at a time.
28. **No admin UI to create/edit `FacilitatorAssignment`s or
    `Organization`s.** Assigning a facilitator to a business is still a
    direct DB write in test scripts, same as before this phase — Admin
    Users manages roles, not business-facilitator pairings; a natural
    extension of `/admin/users` or a new `/admin/facilitators` screen for
    a later phase.
29. **`AssessmentScoringConfig.stageWeights` and `.statusBands` are
    admin-visible (returned by the API) but not editable from
    `/admin/assessments` this phase** — only `stageThresholds` and
    `excellenceThreshold`, the two fields the model's own doc comments
    flag as the configurable ones. Editing per-stage weights or the
    status-band label ranges would need a slightly richer form (a
    dynamic list of bands); deferred rather than built partially.
30. **"Session Viewed" in the admin funnel is permanently "Not
    tracked."** No page-view analytics infrastructure exists anywhere in
    this app — adding it would mean a new event-logging model and
    instrumentation on every marketing/session page, well beyond this
    phase's scope. Rendered honestly rather than estimated.
31. **The richer `getRealLastActivityBulk()` last-active signal (used
    only by the Facilitator Dashboard and admin funnel) queries 4 tables
    per call** (Business, RoadmapTask, AiConversation, WeeklyCheckIn).
    Fine at this scale (a facilitator's participant list and the
    platform-wide funnel are both small); would want a denormalized
    "lastRealActivityAt" column recomputed on write if this ever needs to
    run over thousands of businesses on every request.
32. **`OrganizationMembership.role` is an open string (ADMIN/FACILITATOR/
    MEMBER), not a Postgres enum**, matching this schema's existing
    convention for categorical fields product may want to extend without
    a migration (e.g. `Business.accountabilityCadence`). Validated to
    exactly those 3 values in `src/lib/validations/organization.ts` and
    `src/lib/organizations/access.ts`'s `ORG_ROLES` const — not enforced
    at the database layer.
33. **A cohort's or organization's "participant list" has no cap or
    pagination.** Fine at this phase's scale (tens of participants per
    cohort); a cohort or org analytics query iterating thousands of
    businesses would want pagination on the underlying list views before
    that becomes real.
34. **Sponsorship and cohort assignment resolve a participant by email
    through a small lookup endpoint** (`/api/organizations/[id]/
    participants/lookup`) rather than a search-as-you-type business
    picker. Takes the first `UserBusinessMembership` found for that
    email (a member has at most one business today — same MVP
    assumption `/api/business` already makes) — fine until multi-
    business support lands, at which point this lookup would need a
    disambiguation step.
35. **An organization's "participants" (for analytics/Impact Report
    purposes) are the union of its cohort members and its sponsored
    businesses** (`getOrganizationBusinessIds()`), deduplicated. A
    business sponsored by an org but never assigned to any cohort still
    counts — matches the spec's "sponsored access" being independent of
    cohort membership.
36. **No UI yet to remove an organization staff member or change their
    org role after adding them** — `POST /api/organizations/[id]/members`
    upserts by email (re-adding with a new role updates it), but there's
    no dedicated "change role" or "remove" control on the Staff card yet.
    A natural follow-up alongside a real `FacilitatorAssignment` admin UI
    (Known Issue #28).
37. **`SessionOffering.organizationId` (modeled since Phase 3) has no
    admin UI yet to actually attach a session to an organization** — the
    org dashboard's "Training Sessions" count reads it honestly (real
    query, currently 0 for every org until sessions are linked), but
    `/admin/sessions`'s create form doesn't yet expose an organization
    picker. A small follow-up to the existing session-create form, not a
    schema change.
38. **`RateLimitHit` and `ErrorLog` aren't purged on a schedule.** Both
    grow indefinitely — fine at this scale/for launch, but a real
    production deployment should add a periodic cleanup (e.g. delete
    `RateLimitHit` rows older than the longest configured window,
    `ErrorLog` rows past a retention period) once there's real traffic.
39. **Support has no logged-out path.** `/support` requires a signed-in
    user — a prospective member with a pre-signup question has nowhere
    to ask. Deliberately scoped this way (see Important Decisions);
    revisit if that becomes a real need.
40. **The legal pages (`/terms`, `/privacy`, `/refund-policy`) are a
    real first draft, not attorney-reviewed.** Written to accurately
    describe this app's actual behavior, not generic boilerplate — but
    should be reviewed by a licensed attorney before a real public
    launch, same as any first-draft ToS/Privacy Policy.
41. ~~Real `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, and `ANTHROPIC_API_KEY`
    still aren't configured in this sandbox~~ **RESOLVED — all three are
    now provisioned in `.env` and live-verified.** See Known Issues #1,
    #13, #16, #17. The one credential-shaped item genuinely still open is
    a production `STRIPE_WEBHOOK_SECRET` from a real Dashboard/CLI
    endpoint for whatever environment this deploys to — the local one in
    `.env` is a Stripe CLI forwarding secret, valid only while `stripe
    listen` runs.

## DATABASE CHANGES

- New migration: `prisma/migrations/20260811010000_launch_hardening` —
  purely additive, no existing table touched.
  - New model `RateLimitHit` (key, createdAt, indexed on
    `(key, createdAt)`) — one row per attempt against a rate-limited
    action; DB-backed rather than a new Redis dependency.
  - New model `ErrorLog` (message, stack, context Json, createdAt,
    indexed on createdAt) — self-hosted error monitoring.
  - New enum `SupportRequestStatus` (`OPEN`/`RESOLVED`); new model
    `SupportRequest` (userId, subject, message, status default `OPEN`) —
    `User` gained the `supportRequests` back-relation.
- New migration: `prisma/migrations/20260811000000_organizations_cohorts`
  — purely additive, no existing table touched.
  - New enum `OrganizationType` (10 values); `Organization` gained
    `type`, white-label fields (`logoUrl`, `primaryColor`,
    `secondaryColor`, `customDomain`, `brandedFromName`,
    `brandedFromEmail`), and `allowIndividualParticipantData` (default
    `false`).
  - New enum `CohortStatus` (4 values); new model `Cohort`
    (organizationId, name, description, status default `PLANNED`,
    startDate, endDate).
  - New model `CohortMembership` (cohortId, businessId, joinedAt, unique
    on `(cohortId, businessId)`) — a Business's membership in a Cohort.
  - `Membership`: added `sponsorOrganizationId` (nullable FK to
    `Organization`, relation name `MembershipSponsor`) and
    `sponsoredUntil` (nullable `DateTime`) — both only ever set by the
    Phase 12 sponsorship flow; every pre-existing `Membership` row has
    both as `NULL`.
  - `Business`: added `jobsCreatedSelfReported` (`Int?`).
- New migration:
  `prisma/migrations/20260810230000_facilitator_admin_command_center` —
  purely additive, no existing table touched.
  - New model `AiPromptTemplate` (mode `AiMode` unique,
    systemPromptFragment, isActive, updatedByUserId) — an admin-editable
    override layer in front of Phase 7's hardcoded per-mode system
    prompts.
  - New model `Program` (name, description, isActive) — a named catalog
    a `SessionOffering` can optionally belong to.
  - `SessionOffering`: added `programId` (nullable FK to `Program`,
    `onDelete: SetNull`).
  - `User`: gained the `aiPromptTemplatesUpdated` back-relation (no new
    column).
  - `src/lib/billing/membership.ts`: `STATUSES_WITH_BUILDER_ACCESS`
    (previously module-private) is now exported — reused directly by
    `src/lib/admin/metrics.ts`'s Active Members count instead of forcing
    a full `Membership` object through `membershipGrantsAccess()` just
    to read one array.
- New migration: `prisma/migrations/20260810220000_advanced_business_tools`
  — purely additive, no existing table touched.
  - New enums `LeadStage` (7 values), `SalesScriptType` (6 values),
    `ContentCadence` (3 values), `ContentStatus` (4 values).
  - New models: `Lead` (businessId, the spec's 9 CRM fields, `stage`
    default `NEW_LEAD`), `JourneyStage` (businessId, name, description,
    order — no default rows written by the migration itself; seeded
    lazily per business on first visit, see Important Decisions),
    `Sop` (businessId, the spec's 9 SOP fields), `AutomationStep`
    (businessId, order, the spec's 7 automation fields), `Offer`
    (businessId, the spec's 9 offer fields, `savedToBlueprintAt`),
    `MarketingPlan` (businessId, the spec's 8 fields), `SalesScript`
    (businessId, type, title, content), `ContentPlanItem` (businessId,
    cadence default `WEEKLY`, idea, platform, status default `IDEA`,
    cta, plannedDate).
  - `Business`: gained 8 new relation arrays (`leads`, `journeyStages`,
    `sops`, `automationSteps`, `offers`, `marketingPlans`,
    `salesScripts`, `contentPlanItems`) — no new scalar columns.
  - Money fields (`Lead.valueCents`, `Offer.priceCents`) are integer
    cents, matching this schema's existing convention.
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

## IMPORTANT DECISIONS (Phase 10 additions)

- **Create/Read/Delete (+ one quick-change control where the spec tracks
  a status), not full field-by-field editing, for all 8 tools.** The
  spec's acceptance checklist asks that each tool "works" or "saves" —
  never "is editable" — and every one of these records is cheap enough
  to delete and re-create if a member wants to change more than its
  stage/status. Building a generic multi-field edit form for 8 different
  shapes would have doubled this phase's surface area for a requirement
  the spec never actually states; documented as Known Issue #24 at the
  time — **since built in the "Second Follow-Up Pass" below**, once real
  usage did ask for it: one shared, generic `EditToolModal`
  (`src/components/tools/edit-tool-modal.tsx`) instead of eight
  near-duplicate edit forms, following the exact same "one shared
  component" pattern this bullet already used for delete.
- **One shared `DeleteButton` and one shared `ReorderButtons` component**
  (`src/components/tools/`) instead of eight near-duplicate ones. Every
  Phase 10 tool's delete affordance and (for Journey/Automation) reorder
  affordance behaves identically — same confirm-then-DELETE flow, and
  (since the Second Follow-Up Pass) the same single-atomic-transaction
  reorder flow — which also means a future bug fix or design change to
  either only has one place to happen.
- **Customer Journey's default 9 stages are seeded lazily on first page
  load** (`ensureJourneyStagesSeeded`), the same idempotent "ensure*"
  pattern this app uses for Blueprint document creation, membership
  activation, and roadmap generation — not a migration-time seed script.
  A business that visits `/tools/journey` for the first time gets real
  rows written to `JourneyStage` at that moment, not synthetic defaults
  computed on every render, so renaming/reordering/deleting them behaves
  identically to a stage the member added themselves.
- **The Automation Mapper's "visual sequence" is one flat, ordered model
  (`AutomationStep`) rendered with a connector line — not a separate
  Flow/Step parent-child model.** The spec's 7 fields (Trigger, Action,
  Tool, Timing, Owner, Message, Next Step) already describe exactly one
  step; modeling a wrapping "Flow" entity would have added a table with
  no fields of its own, just to hold an ordered list `order` already
  provides directly on `AutomationStep`.
- **`upsertBlueprintSection()` is a new general-purpose sibling to the
  existing `saveTaskResponseToBlueprint()`**, not a special case bolted
  onto the Offer Builder. Any future Phase 10-style tool that needs to
  write into My Blueprint outside of a RoadmapTask response (the
  Marketing Plan → "Marketing" section, or SOPs → "SOPs" section, are
  natural future candidates flagged for a later phase, see Known Issues)
  can call the same function Offers use, keeping upsert-by-title
  semantics — and the automated-vs-manual `lastEditedAt` distinction
  documented in Phase 6 — in exactly one place rather than reimplemented
  per tool.
- **Only Offer Builder syncs to My Blueprint**, matching the spec's
  literal acceptance line ("Offer builder saves to My Blueprint") rather
  than extending the same behavior to CRM, SOPs, Automation, Marketing
  Plan, Scripts, or Content Planner — several of those already have a
  matching `blueprintDestination` on existing Phase 5 tasks ("CRM",
  "Customer Journey", "SOPs", "Automation", "Marketing", "Sales
  Process", "Follow-Up") that a future phase could wire up the same way,
  but Prompt 10 only asked for it explicitly on Offers.
- **Sales Script templates are static starter text, not AI-generated**,
  identical reasoning to Phase 6's Document Generator: zero new runtime
  dependency, works fully offline in this sandbox, and "Generate/store"
  is satisfied by generating a real, editable starting point rather than
  requiring a live model call just to see a first draft.

## IMPORTANT DECISIONS (Phase 11 additions)

- **The Facilitator Dashboard and Participant Detail share exactly one
  authorization function and one summary-computation function**
  (`getFacilitatorBusinessIds()`, `getParticipantSummaries()` in
  `src/lib/facilitator/participants.ts`) rather than each page
  re-deriving "which businesses can this facilitator see" or "what's
  this business's current task" independently. The original Phase 3
  participants list's inline authorization function was extracted into
  the same shared helper so all three surfaces can never quietly
  disagree with each other.
- **"Current Task" on the Facilitator Dashboard reuses the member
  Dashboard's own `nextBestAction` priority-sort**, rather than a
  facilitator-specific "what should they work on" heuristic. A
  facilitator coaching a member through what to do next needs to see
  literally the same "next" the member's own Dashboard is telling them —
  a second, subtly different definition would be actively confusing in a
  coaching conversation.
- **Reverted mid-phase: broadening `Business.lastActiveAt` writes to
  every authenticated page load, in favor of a derived signal that never
  touches that column.** The first implementation added a
  `touchLastActive()` call to the shared `(app)/layout.tsx` so
  "Last Activity" would reflect real platform-wide usage. Reasoning
  through it caught a real bug before it shipped: Progress's Phase 9
  "Welcome Back" banner depends on reading `lastActiveAt`'s value from
  *before* the current visit, and since every page (including `/progress`
  itself) renders through that same shared layout, the layout's own
  write would have already landed by the time Progress's page code ran
  — meaning the banner would silently stop firing on literally every
  visit. Kept `lastActiveAt`'s write path exactly as Phase 9 left it, and
  instead added `getRealLastActivityBulk()` as a read-only derived
  signal (max of `lastActiveAt` and the latest roadmap-task/AI-
  conversation/check-in timestamp) used only by facilitator/admin views,
  which need "is this business actually active" but have no
  read-before-write ordering to protect.
- **Recommend Session picks from a real dropdown of `SCHEDULED`
  `SessionOffering`s rather than free text**, and is stored as a
  `FacilitatorNote` (type `RECOMMENDATION`) instead of a new dedicated
  model. The note pipeline already has real consumers (Blueprint AI's
  context, the roadmap generator's facilitator-boost text-matching) —
  reusing it means a recommendation is immediately live in both places,
  and a new model would have meant either duplicating that context-
  assembly logic or leaving the new model unconsumed.
- **Send Encouragement is the first real writer for the Phase 1
  `Notification` model.** It sat fully modeled but completely unused
  since the original scaffold — exactly the kind of "architected for
  later" placeholder this build has consistently filled in for real the
  first time a spec prompt actually needed it (same pattern as Phase 8
  replacing the unused `Subscription` placeholder with real
  `Membership`).
- **AI Prompt Templates are an override layer, never a parallel prompt
  system.** `buildSystemPrompt()` still starts from the Phase 7
  hardcoded `AI_MODE_BY_KEY` fragments and only substitutes an admin's
  text when an active `AiPromptTemplate` row exists for that mode — an
  admin can always fall back to "what the app ships with" by toggling a
  mode's override off, without needing to know or retype the original
  wording.
- **Milestones stay read-only in Admin Content.** Every one of the 15
  `MilestoneKey` enum values is referenced directly by code (the
  auto-detection engine in `src/lib/progress/milestones.ts`, the
  Dashboard's milestone snapshot, the Progress page's grid) — an admin
  "editing" a milestone's label here would desync from what the engine
  is actually keyed on unless the enum, the catalog, and an editable copy
  were all kept in lockstep. Shown for visibility; genuinely editable
  milestone content is a bigger schema change than this phase's scope.
- **Only a Super Admin can grant Admin or Super Admin** in
  `/api/admin/users/[id]`, enforced server-side (not just hidden in the
  UI, per this app's Task 4 rule). A flat "any Admin can set any role"
  check would let one compromised or careless Admin account mint
  arbitrarily many more Admins — the one-way ratchet (only the top role
  can grant the top two roles) closes that off while still letting any
  Admin manage the Member/Facilitator/Implementation Specialist roles
  day-to-day.

## IMPORTANT DECISIONS (Phase 12 additions)

- **An organization's own staff role (`OrganizationMembership.role`) is
  a free-text field with 3 validated values, not a new Postgres enum.**
  See Known Issue #32 — matches this schema's existing convention
  (`Business.accountabilityCadence`, `Business.businessStage`, etc.) for
  categorical fields product may reasonably want to extend without a
  migration.
- **`resolveEffectiveStatus()`'s new SPONSORED-expiration branch is
  gated strictly on `sponsoredUntil` being non-null**, so it can never
  fire for a `Membership` created through Phase 8's original admin-grant
  path (which leaves `sponsoredUntil` null and never expires). One
  function, two callers, zero behavior change for existing data — the
  same "extend, never fork" pattern this file has followed for every
  status-resolution change since Phase 8.
- **Cohort and organization stats are computed live from real Assessment/
  Roadmap/SessionRegistration/BusinessMilestone/Sop/AutomationStep/
  WeeklyCheckIn data on every request, never stored on the `Cohort` or
  `Organization` row.** Consistent with this app's "no fake analytics"
  rule (every dashboard/admin/facilitator metric since Phase 4 has been
  computed the same way) and explicitly what the spec asks for: "Track
  Participants, Sessions, Completion, Scores, Engagement, Outcomes."
- **Participant assignment (to a cohort, or for sponsorship) takes an
  email, not a raw `businessId`.** An org admin knows a participant's
  email, not their internal business ID — the UI resolves email →
  business server-side via a small lookup endpoint
  (`/api/organizations/[id]/participants/lookup`) before calling the
  existing businessId-based cohort/sponsor endpoints, so the endpoints
  themselves stay simple and the friendlier UX doesn't require
  duplicating validation logic in two places.
- **An organization's "participants" for analytics purposes are the
  union of its cohort members and its sponsored businesses, not just one
  or the other.** A business can be sponsored without ever being placed
  in a cohort (the spec lists Sponsored Access and Cohorts as separate
  capabilities), and a cohort member doesn't have to be sponsored (some
  orgs may just want to track a group without paying for their access).
  `getOrganizationBusinessIds()` dedupes so a business that's both only
  counts once.
- **`/organization/*` is intentionally not in `ROUTE_GROUP_ROLES`**
  (unlike `/admin` and `/facilitator`, which gate on a platform-wide
  `Role`). An organization's own staff hold no special platform `Role` —
  they're ordinary `MEMBER`s with an `OrganizationMembership` row for
  one specific org. Gating at the proxy layer would require either
  granting them a platform role they don't need (over-broad) or teaching
  the proxy to query the database per-request (a layering violation this
  app's middleware has avoided everywhere else). Every page and API
  route under `/organization` instead calls `assertOrganizationAccess()`
  itself, the same "backend/data access enforces it, not route-hiding"
  rule Task 4 established for everything else.
- **The Impact Report's "Systems Built" figure reuses Phase 10's SOP +
  Automation Step counts** rather than introducing a new tracked metric
  — a real signal that already exists, instead of a plausible-sounding
  number invented for this report.

## IMPORTANT DECISIONS (Launch Hardening additions)

- **The session capacity fix uses Postgres's own `Serializable`
  isolation level plus an application-level retry, not a manual
  advisory lock.** A hand-rolled lock is one more thing to get wrong
  (forget to release it, wrong key granularity); `Serializable` makes
  the database itself the source of truth for "did this conflict with a
  concurrent registration," and Prisma's interactive-transaction retry
  pattern for `P2034` is the documented, standard way to handle the
  (expected, transient) conflict this produces.
- **Rate limiting is DB-backed (`RateLimitHit`), not Redis/Upstash.** At
  this app's scale, a new row-per-attempt + a count query is simpler to
  operate than adding a second datastore, and it's correct across
  multiple app instances without any extra infrastructure — the same
  "the DB can already do this" reasoning this schema has used since
  Phase 1 for PDF export (browser print) and now email (a `fetch` call,
  not an SDK).
- **Error logging is self-hosted (`ErrorLog`), not a Sentry/Datadog
  integration.** No third-party account is needed to get real value from
  it at this scale; a future phase can layer a real APM on top without
  removing this — `logError()` is a small enough surface to call from
  both places if that day comes.
- **Support requests always require a signed-in user.** This app has no
  logged-out support surface yet (a marketing visitor with a
  pre-signup question has no path today) — deliberately scoped to "a
  member is stuck" rather than building a second, unauthenticated
  contact form in the same pass. Documented as a Known Issue, not
  silently left out.
- **The legal pages are a real, feature-specific first draft, not
  generic boilerplate — and not a substitute for attorney review.**
  Written to actually describe this app's behavior (the 30-day trial's
  real trigger, sponsored access, what Blueprint AI is and isn't, who
  can see what data), which makes them more useful *and* means they
  should be reviewed by a licensed attorney before a real public launch
  — the same caveat any first-draft ToS/Privacy Policy needs.

## IMPORTANT DECISIONS (Second Follow-Up Pass additions)

- **One generic `EditToolModal`, not eight per-tool edit forms.** Every
  Phase 10 tool already shared `DeleteButton`; full-field editing follows
  the identical instinct — a small field-spec array
  (`{key, label, type}[]`, types: text/textarea/money/select) drives one
  Radix-`Dialog`-based form component that PATCHes whatever `endpoint` +
  `fields` it's given. The alternative (eight bespoke forms mirroring
  each `Create*Form`) would have been ~8x the code for the same
  behavior, and a future field added to any tool would mean updating a
  form component instead of one array entry.
- **The reorder swap became simpler, not just safer, once it went
  atomic.** `ReorderButtons` used to need both items' `order` values as
  props so it could PATCH each one directly; the new
  `POST .../reorder {aId, bId}` endpoint looks both rows up itself
  inside the transaction, so the component only ever needs IDs. Fixing
  the race condition also deleted code.
- **Integration tests are a genuinely separate Vitest project, not a
  flag on the existing one.** `npm test`'s whole value is being fast and
  hermetic (mocked Prisma, no DB required) — reusing that config for DB-
  backed tests would mean either slowing down every `npm test` run or
  making the mock/real split implicit and easy to get wrong per-file.
  Two configs with two `include`/`exclude` globs keep the boundary
  explicit: `*.test.ts` stays mock-only, `*.integration.test.ts` is
  real-DB-only, and each config actively excludes the other's files
  rather than relying on developers to run the right command.
- **The route-level integration test mocks only `getCurrentUser`, not
  `assertBusinessAccess`.** The whole point of testing a route handler
  against a real database is to exercise its real authorization logic;
  mocking `assertBusinessAccess` would just be re-testing that the route
  calls a function, which the unit-level compiler already guarantees.
  Only "who is signed in" is faked — the same substitution this
  project's live-HTTP scripts already make by logging in with a real
  session cookie instead of re-testing NextAuth's own internals.
- **The accessibility pass fixed the 3 violations axe actually found on
  the 3 named pages, plus the same bug class everywhere else the
  identical component was used — not every occurrence of the underlying
  color pattern app-wide.** `text-navy-400` sits right at the WCAG AA
  edge for small text (~4.55:1 against pure white, computed) and is used
  roughly 80 more times across the app, mostly on decorative icons or
  larger/bold text where it's not a violation. Chasing all ~80 without
  live-testing each one risked "fixing" things that weren't broken while
  claiming more rigor than was actually applied; the honest scope was
  what was asked for (signup, assessment, dashboard) plus the shared
  component (`ProgressBar`) whose bug class was already proven real.

## NEXT RECOMMENDED PHASE

**Prompt 12 was the last numbered prompt in this build sequence; this
build has since had a self-directed Launch Hardening pass fixing the
"Top 10 Launch Risks" from an Ultra Pre-Publish Audit** (session
capacity race, no rate limiting, no email delivery, no legal/support
surfaces, no error monitoring, a real mobile bug at 320px, and a start
on an automated test suite), **followed by a Second Follow-Up Pass**
closing full-field editing on all 8 Phase 10 tools, the reorder
endpoint's atomicity, a real accessibility pass (3 fixed violations),
`robots.txt`/`sitemap.xml`, and route/integration test coverage. What's
left below is follow-up work each phase flagged as out of scope, not a
next numbered phase:

- ~~Real `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, and `RESEND_API_KEY`~~
  **RESOLVED — all three provisioned in `.env` and live-verified** (real
  Checkout Session + Stripe-signed webhooks including a genuine
  redelivery, a context-grounded AI response, and a real password-reset
  email accepted by Resend through the app's own route). What's left is
  a production-grade `STRIPE_WEBHOOK_SECRET` for whatever environment
  this actually deploys to — the local one is a Stripe CLI forwarding
  secret, only valid while `stripe listen` runs.
- ~~Expanding the automated test suite past pure functions~~ **RESOLVED
  — see the "Second Follow-Up Pass" section.** `npm run test:integration`
  now covers `assertBusinessAccess` (real cross-tenant isolation),
  `checkRateLimit` (real DB-backed limiting), the session-capacity race
  itself (two real concurrent transactions), and a full route handler
  (`POST /api/tools/automation/reorder`) — 15 tests against a real
  Postgres database, on top of the 31 pure-function `npm test` cases.
  Roadmap generation and the other route handlers are still verified
  live only; this closed the highest-risk gap (the capacity race), not
  every remaining one.
- **A full assessment-history browser** (Known Issue #23) — only the two
  most recent completed assessments are ever compared; a member who
  reassesses multiple times has no in-app view of every past result.
- ~~Full-field editing for the 8 Phase 10 tools~~ **RESOLVED — see the
  "Second Follow-Up Pass" section.** All 8 tools now support editing
  every field of an existing record in place via a shared modal, not
  just Create/Read/Delete plus a quick status control.
- ~~A dedicated `FacilitatorAssignment` admin UI outside an organization
  context~~ **RESOLVED** — `/admin/sessions` now has a Facilitator
  Assignments card (create by owner email, list, revoke), not a direct
  DB write. (This fix, the org-picker fix below, and the "Prior Art"
  section above were built in a session that predates this doc entry
  being written — see the correction note there.)
- **Full editing of `stageWeights`/`statusBands`** on the admin Scoring
  Thresholds form (Known Issue #29) — only the two primary threshold
  fields are editable this phase.
- **A real Resources library page and Progress "story" narrative** for
  members — Phase 11 gave Resources real admin-managed content for the
  first time, but the member-facing `/resources` page itself is still a
  `ComingSoon` placeholder that doesn't yet read from it.
- ~~A way to attach a `SessionOffering` to an `Organization` from the
  admin session-create form~~ **RESOLVED** — the create-session form now
  has an Organization picker.
- **Real custom-domain routing and branded-email delivery** behind Phase
  12's White-Label fields (Known Issue — see Phase 12 summary) — stored
  and displayed only, by explicit spec instruction not to build domain
  infrastructure this phase.

---

### Correction — undocumented work that landed between the last entry above and this audit

Three real, shipped pieces of work happened in the gap after "Second
Follow-Up Pass" above and were never logged here (a process gap, not a
code gap — all were lint/typecheck/test/build-verified and live-verified
at the time):

1. **Facilitator Assignments admin UI** and **Organization picker on
   admin session-create** — the two "RESOLVED" corrections just above.
2. **`VisionBoardProfile` model + Worksheet HTML/CSS template system** —
   `src/components/blueprint/worksheet.tsx` (numbered panels, script
   header, Passion/Power/Legacy-branded, print-safe) now renders the
   Assessment Results page and the Blueprint Scorecard. `VisionBoardProfile`
   holds My Vibes, Resources (have/need), a 7-field Business Model
   Canvas, Daily Affirmations, and accountability-partner name/contact —
   editable at `/my-blueprint/vision-board`.
3. **`PersonalAccessToken` model + Custom GPT Action export** —
   `GET /api/gpt/vision-board` (Bearer-token authenticated) and
   `GET /api/gpt/openapi.json` let a member's own ChatGPT Custom GPT pull
   their real Blueprint data. Token lifecycle (generate/list/revoke) at
   Settings → Connect ChatGPT.
4. **Admin "Businesses" directory** (`/admin/businesses`) — search any
   business, view an overview, and reach full edit access to that
   business's My Blueprint and Vision Board Profile (same components/
   routes the member uses, addressed at an admin-chosen `businessId`),
   plus a read view of their Scorecard.

This is directly relevant prior art for the Vision Board & Blueprint
Generator audit immediately below — see its §1 and §8.

---

## AUDIT — Personalized Vision Board & Blueprint Generator (pre-implementation)

**Date:** 2026-08-13. **Scope:** read-only audit per explicit instruction
— no application code, packages, or database changes made. Full 14-point
audit (architecture, files/routes, database, answer structure, scoring
flow, auth/access-control flow, session-completion/subscription logic,
missing fields, recommended DB changes, proposed routes, proposed
component tree, risks, phased plan, acceptance criteria) was delivered in
chat and is not duplicated here in full; this entry records the
process-required summary.

**Files inspected:** `docs/BLUEPRINT_MASTER_SPEC.md` (full, 431 lines —
confirmed it is a *visual* directive only; no numbered functional "spec
Prompt N" list exists anywhere as a canonical document — those only exist
as scattered references inside this file's own phase narratives and code
comments); this file in full; `prisma/schema.prisma` (all 55 models);
`src/lib/assessment/scoring.ts`, `scoring-config.ts`; `src/lib/session.ts`,
`src/lib/rbac.ts`; `src/lib/sessions/qualification.ts`
(`registerForSession`, `markAttendance` — confirmed no payment step
anywhere in either); `src/lib/billing/membership.ts`, `pricing.ts`;
`src/app/(app)/dashboard/page.tsx`; `SessionOffering`/`SessionRegistration`
fields directly (confirmed `priceCents` exists but is `null` in every
seeded template, and `SessionRegistration` has no payment fields at all);
`src/lib/blueprint/vision-board.ts`, `src/components/blueprint/worksheet.tsx`,
`src/app/admin/businesses/*` (confirmed all still present and correct).

**Key finding:** most of the requested board content already has a real
data source or a real fixed-template renderer (see §8 in chat and the
"Correction" section above) — this is a *tiering and payment* feature
layered on existing content, not a from-scratch build. The genuinely
missing piece is the $150 qualifying-session payment: `SessionOffering.priceCents`
is unpopulated and `SessionRegistration` has zero payment fields or
Stripe linkage today.

**Current blockers (all pre-implementation, by design — none require
action before starting):**
- No payment/qualification fields exist on `SessionRegistration`; the
  $150 charge has no schema, no Checkout flow, no webhook handling.
- No preview-vs-full access tier exists for the vision board today —
  Assessment Results, Vision Board Profile, and the Scorecard all render
  fully for any signed-in member with a business, with no gate.
- Four of the twelve requested board sections (My Story, My Why, Action
  Plan cadence view, Legacy impact, 90-Day Goal Tracker) have partial or
  no dedicated real-data field yet — see §8/§9 in chat.
- No AI-JSON-generation endpoint or validation schema exists yet for
  vision-board recommendations (Blueprint AI's existing chat endpoint is
  conversational, not structured-JSON-out).

**Recommended next phase:** the 7-step phased plan delivered in chat
(§13) — schema/seed, session payment + webhook, access tiering, AI JSON
generation + validation, template completion for the 4 partial sections,
gated downloads, then the standard verify-and-document pass. Per explicit
instruction, **implementation has not started** and should not begin
until separately approved.

---

## IMPLEMENTATION — Personalized Vision Board & Blueprint Generator (complete)

**Date:** 2026-08-13. User approved the audit above ("ok move forward")
and the full 7-step phased plan was built, verified, and deployed in one
continuous pass. Every acceptance criterion in the audit's §14 is met.

**1. Schema** (`prisma migrate dev` — `vision_board_generator_payment_and_narrative_fields`):
- `SessionRegistration`: `paidAt`, `amountPaidCents`, `stripeCheckoutSessionId`,
  `stripePaymentIntentId` — written only by the payment webhook.
- `VisionBoardProfile`: `myStory`, `myWhy`, `legacyImpact`,
  `actionPlanThisWeek`, `actionPlanThisMonth` (all `@db.Text`, all optional).
- New `VisionBoardGeneration` model — stores every AI draft (`payload`
  Json, validated before it's ever written) with `promotedAt` marking
  whether/when a member accepted it into their real profile.

**2. Qualifying-session payment:**
- `QUALIFYING_SESSION_PRICE_CENTS = 15000` in `src/lib/billing/pricing.ts`;
  backfilled onto every existing `SessionOffering` via an idempotent
  `ensureSessionPricingBackfilled()`.
- Real Stripe Checkout (`mode: "payment"`) at
  `POST /api/sessions/registrations/[id]/checkout`; the
  `checkout.session.completed` webhook now routes by
  `metadata.kind` to either the existing subscription handler or the new
  `handleSessionPaymentCompleted` — same signature-verified,
  idempotency-table-protected webhook endpoint as Phase 8, no new
  webhook route.
- `RegistrationStatus` shows a "Pay $150 to Confirm" button once
  registered, "✓ Paid $150" once paid.

**3. Payment-gated qualification:**
- `unlockBuilderAccessIfQualifying()` (`src/lib/sessions/qualification.ts`)
  is the single shared check called from both `markAttendance` (facilitator
  marks attendance) and the payment webhook (member pays) — whichever
  event lands second is what actually flips `Business.builderAccessEligible`.
  Attendance status itself is always recorded honestly regardless of
  payment state; only the *qualifying* determination waits on payment for
  sessions with a `priceCents`.

**4. Access tiering (preview vs. full):**
- Preview tier (free, unlocks at assessment completion): Assessment
  Results — unchanged, plus a new locked teaser panel advertising the
  full Vision Board.
- Full tier (needs `builderAccessEligible` + an active `Membership`, the
  same `getBuilderAccessState()` every other Builder surface already
  used): Vision Board Profile editing, the full Vision Board render, the
  print Scorecard, and the GPT export API.

**5. AI structured-JSON generation:**
- `POST /api/blueprint/vision-board/generate` — grounds a Claude call in
  the business's real context (`assembleAiContext`, the same assembly
  Blueprint AI chat uses), demands a single JSON object back, and
  zod-validates it before it's ever stored. Anything that fails
  validation or parsing is discarded (502), never reaches a profile.
- `POST /api/blueprint/vision-board/generate/[id]/promote` — the only
  path a drafted field can take into the real `VisionBoardProfile`; a
  field the model returned `null` for is skipped, never overwrites real
  content with nothing.
- The Vision Board Profile form's "AI Draft Assist" button calls
  `generate` directly and drops results into the form's *unsaved* local
  state — the member reviews/edits and hits the existing Save button,
  so `promote` stays available as a standalone API without needing a
  second round-trip in this particular UI.

**6. The board itself:**
- `/my-blueprint/vision-board/view` — the rendering constraint's actual
  deliverable: a fixed, responsive HTML/CSS template (the existing
  Worksheet system), never an AI-generated image. All twelve required
  sections render from `getVisionBoardExport()`, so this page and the
  GPT export JSON can never drift apart. The 90-Day Goal Tracker needed
  no new field — `GoalCadence.NINETY_DAY` already existed — just the
  filtered query.

**7. Verified:** `npx tsc --noEmit`, `npm run lint`, `npm test` (31),
`npm run test:integration` (35, including new coverage for the payment
gate, the full-tier gate, and the generate/promote round trip), and a
production `next build` all pass. Live-verified with Playwright against
a real seeded account and a real `ANTHROPIC_API_KEY`: the full board
renders correctly with real data and honest empty states, and AI Draft
Assist produced genuinely grounded (non-fabricated) content. That live
pass caught and fixed one real bug (not present in the final code): the
draft-assist notice text initially read an outer array mutated as a side
effect inside a `setValues()` updater, which React doesn't guarantee
runs synchronously — the drafted fields still applied correctly, but the
notice could say "nothing changed" when something had. Fixed by
computing that list from the response directly, before calling
`setValues`.

**What's genuinely still open, not blocking this feature:**
- `STRIPE_WEBHOOK_SECRET` for the $150 session Checkout is the same
  production-secret gap Phase 8 already flagged for the subscription
  webhook — one webhook endpoint, one secret, already tracked above.
- No admin-facing full-board *viewer* (admins have full edit access via
  the existing Vision Board Profile editor at
  `/admin/businesses/[businessId]/vision-board`, just not a read-only
  rendered board) — not required by the spec, which only mandates the
  member-facing board.
