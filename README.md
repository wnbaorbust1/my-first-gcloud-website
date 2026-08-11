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
- **Anthropic Claude** (`@anthropic-ai/sdk`) for AI lesson/assignment generation, editing, and TEKS matching
- **Recharts** for the TEKS mastery dashboard's charts
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
      assessments/page.tsx        Course picker for assessment authoring
      assessments/[courseSlug]/page.tsx                Assessments grouped by unit, originals with
                                                        their retake/modified variants grouped together
      assessments/[courseSlug]/generate/page.tsx       AI assessment generation form
      assessments/[courseSlug]/[assessmentId]/edit/page.tsx   Assessment editor + one-click
                                                        retake/modified variant generation
      teks/page.tsx                AI-assisted TEKS standards import (paste → parse → review → commit)
    teks-mastery/                Teacher-facing (not admin) — RLS-owned by the signed-in teacher
      page.tsx                    Class list + create-class form
      [classId]/page.tsx           Roster, mastery chart, struggling-TEKS panel, mastery grid
    gradebook/                   Teacher-facing — roster, grade entry, mastery trend chart
      page.tsx                    Class list + create-class form (same classes as TEKS Mastery)
      [classId]/page.tsx           Roster, grade entry (Ledger Line rows, gold stamp when graded),
                                    trend chart (student or class average, by unit + TEKS code)
  api/ai/                      Server-only Claude-backed Route Handlers (see "AI lesson generation")
    generate-lesson/route.ts    POST → generates + saves a new draft lesson
    lesson-assistant/route.ts   POST → one field-scoped edit suggestion
    fill-gaps/route.ts          POST → topic suggestions for a unit's empty week/day slots
    generate-assignment/route.ts   POST → generates + saves a new draft assignment
    generate-assessment/route.ts   POST → generates + saves a new draft assessment
    regenerate-assessment/route.ts   POST → retake or modified variant from an existing assessment
    suggest-teks/route.ts       POST → semantic TEKS match suggestions for a lesson/assignment/assessment
    import-teks/route.ts        POST → parses raw pasted TEKS text into structured rows

components/
  layout/                    Shell, NavRail — signed-in app chrome
  ui/                        Shared primitives (LedgerRow, StatusStamp, CourseTag)
  auth/                      LoginForm, SignupForm, ForgotPasswordForm, ResetPasswordForm,
                              GoogleSignInButton, SignOutButton, form primitives
  curriculum/                CourseCard (the one sanctioned "card" use), CurriculumSpine
                              (course-scoped planner spine), LessonDetailView
  admin/                     AdminTabs (Curriculum/Assignments/Assessments/TEKS Import sub-nav),
                              CourseSwitcher, LessonGenerateForm, LessonEditorForm,
                              LessonAssistantPanel (chat-style AI panel), GapSuggestionsPanel,
                              AssignmentGenerateForm, AssignmentEditorForm, AssignmentTypeFilter,
                              AssessmentGenerateForm, AssessmentEditorForm (per-question-type
                              editing), AssessmentVariantActions (one-click retake/modified),
                              TeksSuggestionPanel (embedded in all three editors), TeksImportForm
  teks/                      Teacher-facing mastery UI: CreateClassForm, RosterSection,
                              MasteryGrid, MasteryStatusControl (the gold-stamp-on-mastered
                              control), MasteryChart, StrugglingTeksPanel
  gradebook/                 Teacher-facing gradebook UI: GradeEntrySection (item picker + Ledger
                              Line rows, gold stamp on graded rows), TrendChart, TrendSection
  assignments/ assessments/ portfolio/ billing/   (empty — reserved for a future teacher-facing
                              browse view; authoring UI above lives in components/admin/)

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
                                 getWeekWithLessons/getLessonDetail/getPublishedAssignmentsForCourse
                                 — all RLS-only access control
    constants.ts                 Segment/assignment-type/question-type/mastery-status order+labels,
                                 struggling-TEKS threshold
  admin/
    curriculum-queries.ts        getCourseOutlineForAdmin/getWeekByNumber/getAllTeks/getLessonForEdit
                                  — admin reads, same RLS as teacher queries (is_admin() sees everything)
    validation.ts                 lessonSaveSchema — the editor save form's Zod schema
    actions.ts                    saveLessonAction Server Action (draft save / publish)
    assignment-queries.ts         getUnitsWithAssignments/getUnitsForCourse/getAssignmentById
    assignment-validation.ts      assignmentSaveSchema — the assignment editor's Zod schema
    assignment-actions.ts         saveAssignmentAction Server Action (draft save / publish)
    assessment-queries.ts         getUnitsWithAssessments/getAssessmentById (with source_assessment)
    assessment-validation.ts      assessmentSaveSchema — the assessment editor's Zod schema
    assessment-actions.ts         saveAssessmentAction Server Action (draft save / publish)
    teks-actions.ts               commitTeksImportAction — upserts admin-approved import rows
  teacher/                      Teacher-owned operational data — RLS via profile_id/teacher_id =
                                 auth.uid(), not is_admin(); see the gradebook/mastery sections below
    roster-queries.ts             getClassesForTeacher/getClassWithStudents
    roster-actions.ts             createClassAction/addStudentAction/removeStudentAction
    grade-actions.ts              recordGradeAction — records a grade against an assessment OR an
                                   assignment, returns (never applies) mastery-status suggestions
    gradebook-queries.ts          getGradableItemsForCourse/getGradebookData/getTrendData
    gradebook-actions.ts          fetchTrendDataAction — Server Action wrapper so the trend
                                   chart's client-side controls can re-query without a Route Handler
    mastery-queries.ts            getMasteryDashboardData — the grid + chart + struggling-TEKS data
    mastery-actions.ts            updateMasteryStatusAction — the one write path for a mastery cell
  ai/
    client.ts                    getAnthropicClient() singleton, AI_MODEL constant, server-only
    prompts.ts                    PEDAGOGY_FRAMEWORK system prompt + per-task prompt builders,
                                  per-assignment-type and per-question-type generation guidance,
                                  TEKS-suggestion, TEKS-import, and assessment-variant prompt builders
    schemas.ts                    Zod schemas for every AI structured output (also the shared
                                  LessonSnapshot type used by the editor + assistant panel)
    generate-lesson.ts            generateLesson() — full-lesson generation
    lesson-assistant.ts           requestLessonAssistantEdit() — single-field edit
    fill-gaps.ts                  fillCurriculumGaps() — gap-slot topic suggestions
    generate-assignment.ts        generateAssignment() — full-assignment generation
    generate-assessment.ts        generateAssessment() / regenerateAssessmentVariant() — full
                                  generation and retake/modified variant generation
    suggest-teks.ts               suggestTeksForContent() — semantic TEKS matching
    import-teks.ts                parseTeksImport() — raw text → structured {code, description} rows
  utils.ts                    cn() class-merge helper
  assignments/ assessments/ portfolio/ billing/   (empty, next phases)

types/
  supabase.ts                 Database type, hand-written to match supabase/migrations/*.sql
  curriculum.ts                Course/Unit/Week/Lesson/LessonSegment/Teks/Assignment/Assessment/
                                Class/Student/Grade/TeksMastery + composed types (UnitWithWeeks,
                                WeekWithLessons, LessonDetail, UnitWithAssignments,
                                UnitWithAssessments, ClassWithStudents)
  index.ts                    Barrel export

supabase/
  migrations/                 SQL migrations — profiles, courses, subscriptions,
                               academic_calendars/calendar_days, auth_rate_limit_attempts,
                               teks, units, weeks, lessons/lesson_segments, assignments,
                               classes/students/assignment_grades/teks_mastery,
                               assessments/grades (assignment_grades retired into grades)
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
- **classes** / **students** / **grades** / **teks_mastery** — teacher-
  owned operational data, see "Gradebook and TEKS mastery" below. Same
  RLS shape as academic_calendars (an owner column checked against
  `auth.uid()`), not the admin-only shape curriculum content uses.
  `students` carries both `class_id` (what actually scopes a roster to a
  course) and a denormalized `teacher_id` + free-text `class_period`;
  `grades` is a single table covering both assessment and assignment
  grades (exactly one of `assessment_id`/`assignment_id` set, enforced by
  a `CHECK` — it replaced an earlier assignment-only `assignment_grades`
  table, whose data was migrated across before that table was dropped).
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

**assessments** — also belongs to a `unit`, holds `title`, a structured
`questions` jsonb array (one of 8 `question_type` values per question —
multiple_choice, true_false, matching, calculation, short_response,
scenario_analysis, essay, performance_task — shape-validated by trigger
the same way as assignments' rubric), `answer_key`, and `teks_ids`. The
publish gate requires a title, at least one question, and an answer key.
Every row also carries `variant_type` (`original`/`retake`/`modified`)
and a nullable `source_assessment_id`, with a `CHECK` constraint pairing
them (`original` ⟺ no source; `retake`/`modified` ⟺ has a source) — a
retake or modified version is its own full `assessments` row, generated
from and linked back to the one it came from, editable/publishable
independently. Same `course_id` denormalization and RLS shape as
assignments.

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
the Curriculum, Assignments, Assessments, and TEKS Import authoring areas.

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
  a dynamic rubric (add/remove criteria, live point total), the answer
  key, and (added in the TEKS mastery migration) a TEKS multi-select with
  the same AI-suggestion panel the lesson editor has. "Save draft" and
  "Publish" go through `saveAssignmentAction` (`lib/admin/assignment-actions.ts`)
  — a single update, since the rubric lives on the same row (no
  upsert-then-update sequencing like lessons' segments).

## Assessment management

Admin-only tooling (`/admin/assessments/...`) for authoring assessments
across 8 question types, reusing the same generation/editor/RLS patterns
as lessons and assignments — plus one-click retake and modified-version
generation from any existing assessment.

- **Generate** (`POST /api/ai/generate-assessment`) — given
  unit/topic/notes, calls Claude with structured output
  (`generatedAssessmentSchema`) and saves a single `draft` assessment row
  (`variant_type: 'original'`). The form is a unit + topic picker at
  `/admin/assessments/[courseSlug]/generate`.
- **Per-question-type generation guidance**: `lib/ai/prompts.ts` has a
  `QUESTION_TYPE_GUIDANCE` map telling the model which of a question's
  `options`/`correct_answer`/`pairs` fields apply to its type (e.g.
  multiple_choice sets `options` + `correct_answer` and leaves `pairs`
  null; essay leaves all three null since it's rubric-graded) — the same
  "structural guidance per variant" idea as assignments'
  `ASSIGNMENT_TYPE_GUIDANCE`. The AI never assigns a question `id`; the
  app stamps a fresh `crypto.randomUUID()` on every generated question so
  each has a stable key regardless of how it was created.
- **One-click retake / modified generation**
  (`components/admin/assessment-variant-actions.tsx`, shown only on
  `original` assessments, `POST /api/ai/regenerate-assessment`) — sends
  the source assessment's questions to
  `regenerateAssessmentVariant()` (`lib/ai/generate-assessment.ts`) with
  a variant-specific system prompt: **retake** asks for new questions
  testing the same skills at the same difficulty (so a student can't
  recall answers from the first attempt); **modified** asks for the
  *same* questions with simplified language and/or reduced multiple-choice
  options, for accommodations. Either way the result saves as its own
  full `assessments` row — `variant_type` set, `source_assessment_id`
  pointing back — and the admin is dropped straight into editing it.
- **Editor** (`/admin/assessments/[courseSlug]/[assessmentId]/edit`,
  `components/admin/assessment-editor-form.tsx`) — per-question-type
  editing (multiple_choice's option list + a radio to mark the correct
  one, matching's left/right pairs, true_false's dropdown, a plain
  correct-answer field for calculation/short_response, no extra fields
  for scenario_analysis/essay/performance_task since those grade via the
  answer key), a live points total, the answer key, and a TEKS
  multi-select with the same `TeksSuggestionPanel` the other editors use.
  A retake/modified assessment shows a link back to the original it came
  from. "Save draft"/"Publish" go through `saveAssessmentAction`.

## TEKS tracking and mastery dashboard

Two distinct pieces, split by who owns the data: TEKS import and
semantic matching are **admin** content-authoring (the `teks` reference
table and `teks_ids` on lessons/assignments/assessments are admin-owned,
same as everywhere else); classes, students, and mastery status are
**teacher-owned operational data**, RLS-scoped to an owner column checked
against `auth.uid()` like `academic_calendars`, not `is_admin()`. Grade
entry itself now lives in the Gradebook (below) — this page consumes
grades, it doesn't collect them.

**Schema note**: nothing before `20260811090006_teks_mastery.sql` modeled
students, classes, or grades at all, so it added the smallest slice that
supports mastery tracking — `classes` → `students`, plus a bare-bones
`assignment_grades` table just to power a mastery suggestion from a
score. The next phase's migration (`20260811090007`) replaced that table
with a real, unified `grades` table covering both assessments and
assignments — see "Gradebook" below.

- **TEKS import** (`/admin/teks`, `components/admin/teks-import-form.tsx`)
  — paste raw TEKS standards text for a subject; `POST /api/ai/import-teks`
  calls Claude (`lib/ai/import-teks.ts`) to extract `{code, description}`
  rows from whatever formatting was pasted in. Every row is editable and
  individually removable before `commitTeksImportAction`
  (`lib/admin/teks-actions.ts`) upserts them into `teks` by `code` — the
  AI never writes to the reference table directly.
- **Semantic TEKS matching** (`components/admin/teks-suggestion-panel.tsx`,
  embedded in the lesson, assignment, and assessment editors, `POST
  /api/ai/suggest-teks`) — given a piece of content's title/body and the
  course's candidate TEKS codes, Claude suggests which ones it likely
  covers with a confidence level and a one-sentence rationale
  (`lib/ai/suggest-teks.ts`). Every suggestion needs an explicit "Add"
  click — it only ever toggles the editor's local `teksIds` state, the
  same state the checklist below it edits, so nothing is written until
  the admin hits Save.
- **Mastery status flow** — manual and auto-suggested share one write
  path, `updateMasteryStatusAction` (`lib/teacher/mastery-actions.ts`),
  which upserts one `teks_mastery` row by `(student_id, teks_code)`:
  - *Manual*: the mastery grid (`components/teks/mastery-grid.tsx`) is a
    TEKS-codes × roster table; each cell is a
    `MasteryStatusControl` (`components/teks/mastery-status-control.tsx`)
    — a select plus a small swatch. The four pre-mastery stages are
    rendered as increasing opacity of the *same* gold-leaf the "mastered"
    stamp uses (a literal color progression toward "earning the gold"),
    and `needs_reteaching` breaks the ramp entirely as solid rose-gold —
    the app's existing "needs attention" color. Every swatch is paired
    with its text label; color never carries meaning alone.
  - *Auto-suggested from grades*: recording a grade in the Gradebook
    (`recordGradeAction`, `lib/teacher/grade-actions.ts`) computes — but
    never applies — a suggested status per TEKS code tagged on the graded
    item, from a simple, single named threshold function
    (`suggestStatusFromScore`). The teacher applies each suggestion
    individually, right there in the gradebook row, which calls the
    exact same `updateMasteryStatusAction` the manual grid uses.
  - **The stamp moment**: `MasteryStatusControl` conditionally renders
    `<StatusStamp>` only while `status === 'mastered'`, so promoting a
    student to mastered mounts it fresh and its existing
    `animate-stamp-land` keyframe (already used for "Published" lessons)
    plays right at the moment of promotion — no new animation needed, just
    reusing the same landing motion for a genuinely new occasion.
- **Dashboard** (`/teks-mastery/[classId]`) — `getMasteryDashboardData()`
  (`lib/teacher/mastery-queries.ts`) resolves the course's relevant TEKS
  codes (the union of `teks_ids` tagged across its lessons and
  assignments — assessments' `teks_ids` feed the gradebook's trend view
  instead, see below), the roster's current status per code, and
  per-code status counts.
  - `MasteryChart` (`components/teks/mastery-chart.tsx`, Recharts) is a
    single-hue horizontal bar per TEKS code — bar length = % of the class
    at "mastered," gold-leaf fill, direct % labels, a full per-status
    breakdown in the hover tooltip. Deliberately not a 6-color stacked
    bar: validated against the `dataviz` skill's palette checks, six
    simultaneously-distinguishable brand-consistent hues don't clear the
    chroma/CVD floors together, so the full breakdown lives in the
    tooltip instead of fighting the color space for a chart mark.
  - `StrugglingTeksPanel` (`components/teks/struggling-teks-panel.tsx`)
    lists TEKS codes with `STRUGGLING_TEKS_THRESHOLD` (2) or more students
    below mastery, sorted worst-first.

## Gradebook

Teacher-facing (`/gradebook/...`, same `classes`/`students` as TEKS
Mastery — the two features share a roster, viewed through different
lenses) — student roster, grade entry, and a mastery trend chart.

- **Grade entry** (`components/gradebook/grade-entry-section.tsx`) — pick
  one gradable item (a published assessment or assignment, pulled from
  `getGradableItemsForCourse()` with a computed total-points figure —
  sum of question points or rubric points), then one Ledger Line row per
  student. An ungraded row shows inline score/out-of inputs defaulted to
  the item's total; a graded row shows the score in **DM Mono** (`27/30`)
  with a gold-leaf `<StatusStamp>` in the margin instead of a generic
  status badge — the same stamp `MasteryStatusControl` uses, so "graded"
  reads as the identical visual language as "mastered" elsewhere in the
  app. Saving a grade surfaces any mastery suggestions inline under that
  row (see "Auto-suggested from grades" above), each with its own Apply
  button.
- **Mastery trend view** (`components/gradebook/trend-section.tsx` +
  `trend-chart.tsx`) — score-over-time for one student or the class
  average, scoped to a unit and optionally filtered to one TEKS code.
  `getTrendData()` (`lib/teacher/gradebook-queries.ts`) resolves the
  unit's gradable items (filtered by `teks_ids` when a code is chosen),
  pulls every matching grade, and reduces to one point per item — that
  student's score, or the class average across everyone who has a grade
  for it, plotted at the item's grade date. The chart itself is a single
  gold-leaf line (Recharts) with a hover tooltip naming the item and its
  score — client-side controls re-fetch via `fetchTrendDataAction`, a
  thin Server Action wrapper, rather than a dedicated Route Handler.

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
✅ TEKS import, AI semantic matching, mastery tracking + dashboard
✅ Assessment management: 8 question types, AI generation, retake/modified variants (admin-only)
✅ Gradebook: roster, grade entry (assessments + assignments), mastery trend chart
⬜ Portfolios / Stripe billing
⬜ Deployment config
