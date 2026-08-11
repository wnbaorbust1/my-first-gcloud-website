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
- **Phase 2** (done): authentication and the core database schema.
- **Phase 3** (done): the curriculum data model (units/weeks/lessons/TEKS) and a read-only browser UI — see below. No create/edit UI or AI generation yet.
- Gradebook, portfolios, billing, etc. land in later phases.

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
    curriculum/                Course picker → per-course outline+lesson browser
      page.tsx                  Course picker (cards)
      [courseSlug]/layout.tsx    Fetches units+weeks, renders <CurriculumSpine> + children
      [courseSlug]/page.tsx      Course overview ("select a week")
      [courseSlug]/[weekNumber]/page.tsx             Week's lessons (Mon-Fri, ledger rows)
      [courseSlug]/[weekNumber]/[dayNumber]/page.tsx  Lesson detail
    admin/                      Admin-only content authoring (requireAdmin() layout guard, <AdminTabs>)
      curriculum/page.tsx        Course picker for admins
      curriculum/[courseSlug]/page.tsx                 Full outline incl. drafts + empty gaps,
                                                        per-unit "fill gaps" trigger
      curriculum/[courseSlug]/generate/page.tsx        AI lesson generation form
      curriculum/[courseSlug]/[weekNumber]/[dayNumber]/edit/page.tsx   Lesson editor + AI assistant
      assignments/page.tsx        Course picker for assignment authoring
      assignments/[courseSlug]/page.tsx                Assignments grouped by unit, filterable
                                                        by course (switcher) and type (dropdown)
      assignments/[courseSlug]/generate/page.tsx       AI assignment generation form
      assignments/[courseSlug]/[assignmentId]/edit/page.tsx   Assignment detail/edit view
  api/ai/                      Server-only Claude-backed Route Handlers (see "AI lesson generation")
    generate-lesson/route.ts    POST → generates + saves a new draft lesson
    lesson-assistant/route.ts   POST → one field-scoped edit suggestion
    fill-gaps/route.ts          POST → topic suggestions for a unit's empty week/day slots
    generate-assignment/route.ts   POST → generates + saves a new draft assignment

components/
  layout/                    Shell, NavRail — signed-in app chrome
  ui/                        Shared primitives (LedgerRow, StatusStamp, CourseTag)
  auth/                      LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm,
                              GoogleSignInButton, SignOutButton, form primitives
  curriculum/                CourseCard (the one sanctioned "card" use), CurriculumSpine
                              (course-scoped planner spine), LessonDetailView
  admin/                     AdminTabs (Curriculum/Assignments sub-nav), CourseSwitcher,
                              LessonGenerateForm, LessonEditorForm, LessonAssistantPanel
                              (chat-style AI panel), GapSuggestionsPanel, AssignmentGenerateForm,
                              AssignmentEditorForm, AssignmentTypeFilter
  assignments/ assessments/ portfolio/ billing/   (empty — reserved for a future teacher-facing
                              assignments view; authoring UI above lives in components/admin/)

lib/
  supabase/
    client.ts                 Browser client (Client Components)
    server.ts                 Server client (Server Components/Actions/Route Handlers)
    admin.ts                  Service-role client — bypasses RLS, server-only, never import client-side
    middleware.ts              updateSession() — session refresh + route protection, called from middleware.ts
  auth/
    actions.ts                 Server Actions: signUp/signIn/signOut/requestPasswordReset/updatePassword
    session.ts                  getCurrentUser/getCurrentProfile/requireUser/requireAdmin/
                                 getAdminProfile for Server Components and Route Handlers
    rate-limit.ts                checkRateLimit/recordAttempt against auth_rate_limit_attempts
    identifiers.ts               Builds the IP/email identifiers rate limiting checks
    account.ts                   accountExistsForEmail — powers the login "no account found" message
    errors.ts                    Supabase AuthError → user-facing copy
    validation.ts                 Zod schemas for all four forms
    types.ts                      Shared Server Action state shape
  curriculum/
    queries.ts                  getCourseBySlug/getAllCourses/getCourseUnitsWithWeeks/
                                 getWeekWithLessons/getLessonDetail — all RLS-only access control
    constants.ts                 Segment order/labels, day labels, the 70-min/5-question constants
  admin/
    curriculum-queries.ts        getCourseOutlineForAdmin/getWeekByNumber/getAllTeks/getLessonForEdit
                                  — admin reads, same RLS as teacher queries (is_admin() sees everything)
    validation.ts                 lessonSaveSchema — the editor save form's Zod schema
    actions.ts                    saveLessonAction Server Action (draft save / publish)
    assignment-queries.ts         getUnitsWithAssignments/getUnitsForCourse/getAssignmentById
    assignment-validation.ts      assignmentSaveSchema — the assignment editor's Zod schema
    assignment-actions.ts         saveAssignmentAction Server Action (draft save / publish)
  ai/
    client.ts                    getAnthropicClient() singleton, AI_MODEL constant, server-only
    prompts.ts                    PEDAGOGY_FRAMEWORK system prompt + per-task prompt builders,
                                  plus per-assignment-type generation guidance
    schemas.ts                    Zod schemas for every AI structured output (also the shared
                                  LessonSnapshot type used by the editor + assistant panel)
    generate-lesson.ts            generateLesson() — full-lesson generation
    lesson-assistant.ts           requestLessonAssistantEdit() — single-field edit
    fill-gaps.ts                  fillCurriculumGaps() — gap-slot topic suggestions
    generate-assignment.ts        generateAssignment() — full-assignment generation
  utils.ts                    cn() class-merge helper
  assignments/ assessments/ portfolio/ billing/   (empty, next phases)

types/
  supabase.ts                 Database type, hand-written to match supabase/migrations/*.sql
  curriculum.ts                Course/Unit/Week/Lesson/LessonSegment/Teks/Assignment + composed
                                types (UnitWithWeeks, WeekWithLessons, LessonDetail,
                                UnitWithAssignments)
  index.ts                    Barrel export

supabase/
  migrations/                 SQL migrations — profiles, courses, subscriptions,
                               academic_calendars/calendar_days, auth_rate_limit_attempts,
                               teks, units, weeks, lessons/lesson_segments, assignments
  seed.sql                    Local-dev-only demo curriculum content (not run against hosted projects)
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
  billing phase). `has_course_access(course_id)` gates lesson reads below.
- **academic_calendars** / **calendar_days** — one calendar per teacher
  per school year, with dated day types (regular/holiday/testing/
  early_release/block_day). RLS scopes both to their owning teacher.
- **auth_rate_limit_attempts** — backs the app-level rate limiting above.
  RLS is enabled with *no policies*, so it's reachable only via the
  service-role client, never through the anon/authenticated API.

`is_admin()` is a `SECURITY DEFINER` helper every other policy calls
instead of querying `profiles` directly — querying `profiles` from within
`profiles`' own RLS policy would recurse.

## Curriculum data model

**Entities** (`units` → `weeks` → `lessons` → `lesson_segments`, plus the
`teks` reference table):

- **teks** — TEKS standard reference data (code/subject/description).
  Seeded with a small illustrative sample per subject — clearly marked as
  placeholder, not verified official text; a full import replaces it
  later without a schema change.
- **units** — a course's top-level groupings (`unit_number`, `title`,
  `teks_focus_summary`). A unit's `course_id` is immutable after creation
  (enforced by a trigger) — reorganizing *within* a course is a real
  workflow, moving a unit to a different course isn't.
- **weeks** — one row per school-year week (1-36), scoped to the
  *course* (not the unit), so "week 12" means the same thing regardless
  of which unit currently contains it. `course_id` is denormalized from
  the parent unit by a trigger.
- **lessons** — one 70-minute class period (`day_number` 1-5, Mon-Fri).
  Holds the four gradual-release fields (`i_do`/`we_do`/
  `you_do_together`/`you_do`), the five QSSSA fields, `homework` (capped
  at 5 questions even in draft), `teks_ids` (validated against `teks` by
  trigger — Postgres can't FK individual array elements), and `status`
  (`draft`/`published`). `course_id` is denormalized from the parent week.
- **lesson_segments** — the bell-to-bell schedule: `bell_ringer`,
  `mini_lesson`, `modeling`, `activity`, `debrief`, `exit_ticket`, each
  with a title/description/`duration_minutes`. A normalized child table
  (not JSONB) so duration is a real, queryable, constrainable column.

**The publish gate**: a lesson can only move to `status = 'published'`
once it has all 6 segments totaling exactly 70 minutes, all four
gradual-release fields, all five QSSSA fields, exactly 5 homework
questions, and at least one TEKS code — enforced by a trigger on
`lessons`. A second, `DEFERRABLE INITIALLY DEFERRED` constraint trigger
on `lesson_segments` closes the other direction: once published, editing
segments down to an invalid state is rejected too, but a single
transaction can still delete-and-reinsert all 6 at once (e.g. AI
regenerating a lesson) without tripping over the mid-transaction gap.
Drafts have no such requirements — they can be as incomplete as the
author likes while being built out.

**RLS**: `units`/`weeks` are readable by any signed-in teacher (the
*shape* of the curriculum isn't paywalled) — only `lessons`/
`lesson_segments` are gated by `status = 'published' AND
public.has_course_access(course_id)`. All writes are admin-only (this
schema doesn't yet have a separate "content-owner" role distinct from
admin — `role` is still just `teacher | admin`).

**assignments** — coursework belonging to a `unit` (not a specific week/
day; a teacher assigns it whenever it fits their pacing). One of 20
`assignment_type` values (classwork, homework, project, guided_notes,
worksheet, spreadsheet, card_sort, simulation, game, case_study, research,
presentation, exit_ticket, quiz, test, lab_investigation, debate,
socratic_seminar, reflection_journal, peer_review). Holds `instructions`
(student-facing), `teacher_directions` (never shown to students), a
structured `rubric` (jsonb array of `{criterion, points, description?}`,
shape-validated by trigger on every write — Postgres can't constrain
jsonb array element shape any other way), and `answer_key`. Same
`course_id` denormalization and `draft`/`published` `status` pattern as
`lessons`; the publish gate requires a title, instructions, teacher
directions, a non-empty rubric, and an answer key. RLS mirrors lessons
exactly: admins see everything, teachers see only published assignments
in courses they have access to, all writes admin-only.

## Curriculum browser UI

Course picker → course outline → week → lesson, all Server Components
reading straight off RLS (no manual "can this teacher see this" checks in
app code — a teacher without access just gets an empty result, same as
the content not existing yet):

- `/curriculum` — the 8 course tiles as **cards** — the one place in this
  app cards are the right call (a course is a genuinely discrete object,
  per the design system) — see `components/curriculum/course-card.tsx`.
- `/curriculum/[courseSlug]` — a course-scoped **planner spine**
  (`components/curriculum/curriculum-spine.tsx`), nested inside the main
  NavRail, listing that course's units → weeks with the Ledger Line rule
  under every week row (the first real usage of the signature motif).
- `/curriculum/[courseSlug]/[weekNumber]` — that week's lessons
  (Monday-Friday) as ledger rows, gold-leaf stamped when published.
- `/curriculum/[courseSlug]/[weekNumber]/[dayNumber]` — the lesson
  detail view (`components/curriculum/lesson-detail.tsx`): bell-to-bell
  schedule, gradual release, QSSSA, homework, and TEKS tags — every
  section is a list of `<LedgerRow>`s, reusing the exact same component
  as everywhere else rather than inventing a one-off layout.

`supabase/seed.sql` has demo content (one Algebra I unit, 3 weeks, one
fully worked published lesson, one draft) so the browser has something
real to show in local dev. Create/edit UI and AI generation are covered
next.

## AI lesson generation

Admin-only tooling (`/admin/curriculum/...`) that drafts and edits lessons
with Claude, matching the exact schema the curriculum browser reads. Every
call goes through a server-side Route Handler under `app/api/ai/` — the
Anthropic API key never reaches the browser, and each route re-checks
`getAdminProfile()` itself (RLS backs it up on every write regardless).

- **`lib/ai/prompts.ts`** is the single source of truth for lesson
  structure: `PEDAGOGY_FRAMEWORK` encodes the 6 class-period segments
  (bell ringer → exit ticket, minutes summing to 70), the 4 gradual-release
  stages, the 5-part QSSSA framework, and the "exactly 5 homework
  questions, TEKS chosen only from the given candidates" rules. Every
  generation, edit, and gap-suggestion prompt is built on top of this same
  text, so output stays structurally consistent regardless of which
  endpoint produced it.
- **Generate** (`POST /api/ai/generate-lesson`) — given course/unit/week/
  day/topic/notes, resolves and validates the course→unit→week chain,
  confirms the day slot is empty, calls Claude with structured output
  (`generatedLessonSchema`), and saves the result as a `draft` lesson (never
  auto-published). The form is a cascading unit → week → day picker at
  `/admin/curriculum/[courseSlug]/generate`.
- **Editor** (`/admin/curriculum/[courseSlug]/[weekNumber]/[dayNumber]/edit`,
  `components/admin/lesson-editor-form.tsx`) — every field from the Phase 2
  schema is directly editable (title, 6 segments, gradual release, QSSSA,
  5 homework slots, TEKS multi-select). "Save draft" and "Publish" both go
  through `saveLessonAction` (`lib/admin/actions.ts`), which upserts
  segments before updating the lesson row so the publish-gate trigger sees
  committed data (see the comment there for why order matters).
- **AI Lesson Assistant** (`components/admin/lesson-assistant-panel.tsx`,
  `POST /api/ai/lesson-assistant`) — a chat-style panel next to the editor.
  Each turn is stateless: it sends the *current* in-progress lesson (including
  unsaved edits) plus a free-text instruction, and Claude returns a change
  to exactly one field (`assistantEditSchema`, discriminated by
  `target_field`). Edits are never applied silently — the admin reviews the
  explanation and clicks "Apply to lesson" to write it into the form state.
- **Fill curriculum gaps** (`components/admin/gap-suggestions-panel.tsx`,
  `POST /api/ai/fill-gaps`) — per unit, computes which (week, day) slots
  have no lesson yet, sends them plus the unit's TEKS focus and neighboring
  lesson titles to Claude, and gets back one topic suggestion per slot. The
  route defensively filters the response down to the slots actually asked
  about, dropping anything hallucinated or duplicated. Each suggestion
  deep-links into the generate form, pre-filled.

All three routes call `claude-opus-5` with adaptive thinking and
`output_config.format` (structured outputs via `zodOutputFormat()`) — the
SDK validates Claude's response against the same Zod schema client-side,
so a malformed response fails cleanly with a retryable error instead of
saving bad data.

Admins reach this area from a nav-rail "Admin" entry, shown only when the
signed-in profile's `role` is `admin` (`app/(app)/layout.tsx` →
`components/layout/shell.tsx` → `components/layout/nav-rail.tsx`).
`app/(app)/admin/layout.tsx` calls `requireAdmin()` as a second guard —
the real boundary is still RLS (every curriculum write policy already
requires `is_admin()`). Inside `/admin`, `<AdminTabs>` switches between
the Curriculum and Assignments authoring areas.

## Assignment management

Admin-only tooling (`/admin/assignments/...`) for authoring the 20
assignment types, generated with Claude and reusing the Phase 3 AI
patterns — same streaming + structured-output call shape, same
draft-first save flow, same admin-gated Route Handler posture. No chat
assistant here (that's lesson-specific); this phase is generation + a
full manual editor.

- **Generate** (`POST /api/ai/generate-assignment`) — given
  unit/type/topic/notes, resolves the unit → course, calls Claude with
  structured output (`generatedAssignmentSchema`), and saves the result as
  a single `draft` assignment row (the rubric is inline `jsonb`, so unlike
  lesson generation there's no separate child-table insert). The form is
  a unit + type picker at `/admin/assignments/[courseSlug]/generate`.
- **Per-type generation guidance**: `lib/ai/prompts.ts` has an
  `ASSIGNMENT_TYPE_GUIDANCE` map — one to two sentences per type on what a
  genuinely good example looks like (a quiz's short fixed-answer items vs.
  a case study's scenario-and-recommendation shape vs. a lab's
  procedure-and-results structure) — so a generated "quiz" and a generated
  "project" come out structurally different, not the same template with a
  different label.
- **List view** (`/admin/assignments/[courseSlug]`,
  `components/admin/assignment-type-filter.tsx` +
  `components/admin/course-switcher.tsx`) — assignments grouped by unit
  (drafts included, so gaps are visible), filterable by course (a switcher
  that jumps to the same view for a different course) and by type (a
  dropdown driving the `?type=` query param, filtered server-side via
  `getUnitsWithAssignments()`).
- **Editor** (`/admin/assignments/[courseSlug]/[assignmentId]/edit`,
  `components/admin/assignment-editor-form.tsx`) — every field is
  editable: type, title, student-facing instructions, teacher directions,
  a dynamic rubric (add/remove criteria, live point total), and the
  answer key. "Save draft" and "Publish" go through `saveAssignmentAction`
  (`lib/admin/assignment-actions.ts`) — a single update, since the rubric
  lives on the same row (no upsert-then-update sequencing like lessons'
  segments).

## Environment variables

See `.env.example`. Copy to `.env.local` (already git-ignored) and fill in:
- Supabase project URL + anon key (public), service role key (server-only)
- `ANTHROPIC_API_KEY` (server-only) — powers every `/api/ai/*` route;
  get one at https://console.anthropic.com/
- Stripe publishable key (public), secret key + webhook secret (server-only)
- `NEXT_PUBLIC_SITE_URL` — used to build auth email/OAuth redirect URLs

## Status

✅ Project scaffold, design system, folder structure, Supabase client wiring
✅ Auth (email/password + Google, password reset, rate limiting)
✅ Core database schema + RLS (profiles, courses, subscriptions, academic calendars)
✅ Curriculum data model + read-only browser (units/weeks/lessons/TEKS)
✅ AI-powered lesson generation, editor, AI assistant panel, gap-filling (admin-only)
✅ Assignment management: 20 types, AI generation, list + editor (admin-only)
⬜ Assessments / gradebook / portfolio features
⬜ TEKS import + AI matching + mastery dashboard
⬜ Stripe billing
⬜ Deployment config
