-- Financial life simulation. Three tables spanning three different
-- ownership models:
--   simulation_scenarios  — admin-authored library content (draft/
--                            published, same shape as lessons/assignments)
--   simulation_assignments — a teacher assigning one scenario to one of
--                            their classes, identified by a public join
--                            code students use to play (no student-account
--                            system exists, so this is the access model —
--                            same reasoning as portfolios' teacher-managed
--                            ownership, one step further)
--   simulation_runs        — one student's completed play-through. Written
--                            ONLY by the service-role client from the
--                            public, unauthenticated /api/play/submit route
--                            (see lib/supabase/admin.ts) — there is no
--                            student session to attach an `authenticated`
--                            RLS policy to, so this table intentionally
--                            has no insert/update policy for the
--                            `authenticated` role at all. The API route
--                            itself is the authorization boundary here,
--                            not Postgres RLS.

create table public.simulation_scenarios (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  -- Recurring amount added every round (not a one-time signing bonus) —
  -- named to match the original feature spec's field name.
  starting_income numeric(10, 2) not null check (starting_income >= 0),
  -- [{label, amount}] — summed and subtracted every round.
  fixed_expenses jsonb not null default '[]',
  -- [{round, prompt, options: [{label, impact}]}] — impact is a one-time
  -- signed dollar delta applied the round that option is chosen.
  event_deck jsonb not null default '[]',
  teks_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index simulation_scenarios_course_id_idx on public.simulation_scenarios (course_id);

create trigger simulation_scenarios_set_updated_at
  before update on public.simulation_scenarios
  for each row
  execute function public.set_updated_at();

-- Same validator shape as lessons/assignments/bell_ringers.
create or replace function public.validate_simulation_scenario_teks_ids()
returns trigger
language plpgsql
as $$
declare
  missing_count integer;
begin
  if new.teks_ids is null or array_length(new.teks_ids, 1) is null then
    return new;
  end if;

  select count(*) into missing_count
  from unnest(new.teks_ids) as t (id)
  where not exists (select 1 from public.teks where teks.id = t.id);

  if missing_count > 0 then
    raise exception 'simulation_scenarios.teks_ids contains % id(s) that do not exist in teks', missing_count;
  end if;

  return new;
end;
$$;

create trigger simulation_scenarios_validate_teks_ids
  before insert or update of teks_ids on public.simulation_scenarios
  for each row
  execute function public.validate_simulation_scenario_teks_ids();

alter table public.simulation_scenarios enable row level security;

-- Same shape as lessons_select: admins see everything (including drafts,
-- for editing); teachers only see published scenarios for courses they
-- have access to.
create policy simulation_scenarios_select on public.simulation_scenarios
  for select
  to authenticated
  using (public.is_admin() or (status = 'published' and public.has_course_access(course_id)));

create policy simulation_scenarios_insert_admin on public.simulation_scenarios
  for insert
  to authenticated
  with check (public.is_admin());

create policy simulation_scenarios_update_admin on public.simulation_scenarios
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy simulation_scenarios_delete_admin on public.simulation_scenarios
  for delete
  to authenticated
  using (public.is_admin());

-- ── Assignments (teacher -> class) ──────────────────────────────────────

create table public.simulation_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  scenario_id uuid not null references public.simulation_scenarios (id) on delete cascade,
  -- Short, unguessable-enough code used in the public /play/<code> URL.
  -- Uniqueness enforced here; generated application-side (see
  -- lib/teacher/simulation-actions.ts) with a retry-on-collision loop.
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create index simulation_assignments_class_id_idx on public.simulation_assignments (class_id);

alter table public.simulation_assignments enable row level security;

-- Same ownership shape as classes_all: the assigning teacher (or admin).
-- No `to anon` policy — the public play page reads this table with the
-- service-role client (bypassing RLS) precisely because there's no
-- teacher/student session to check a policy against.
create policy simulation_assignments_all on public.simulation_assignments
  for all
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.classes c
      where c.id = simulation_assignments.class_id
        and c.profile_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.classes c
      where c.id = simulation_assignments.class_id
        and c.profile_id = auth.uid()
    )
  );

-- ── Runs (one student's play-through) ───────────────────────────────────

create table public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.simulation_assignments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  -- [{round, prompt, choice_label, impact, balance_after}] — the full
  -- play-through, for a teacher who wants to see exactly what a student
  -- chose, not just the final number.
  decisions_log jsonb not null default '[]',
  ending_net_worth numeric(10, 2),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  -- One run per student per assignment — replaying overwrites (the submit
  -- route upserts on this constraint) rather than accumulating attempts.
  unique (assignment_id, student_id)
);

create index simulation_runs_assignment_id_idx on public.simulation_runs (assignment_id);

alter table public.simulation_runs enable row level security;

-- Teacher (via assignment -> class -> profile_id) or admin can read
-- results. Deliberately no insert/update policy for `authenticated` — see
-- the header comment. The service-role client used by /api/play/submit
-- bypasses RLS entirely, which is what makes anonymous student writes
-- possible at all without weakening this table's real protection.
create policy simulation_runs_select on public.simulation_runs
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.simulation_assignments sa
      join public.classes c on c.id = sa.class_id
      where sa.id = simulation_runs.assignment_id
        and c.profile_id = auth.uid()
    )
  );
