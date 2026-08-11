-- TEKS mastery tracking: a minimal, purpose-built roster/grades slice plus
-- the mastery table itself.
--
-- IMPORTANT SCOPE NOTE: nothing in the schema so far models students,
-- classes, or grades at all — those are teacher-owned operational data,
-- structurally different from the admin-authored curriculum content in
-- units/weeks/lessons/assignments. teks_mastery.student_id and "auto-
-- suggested from grades" both need *something* to hang off of, so this
-- migration adds the smallest slice that supports mastery tracking:
-- classes, students, and a bare-bones assignment_grades table (just
-- enough to compute a mastery suggestion from a score). This is NOT the
-- future gradebook/assessments feature — that's still its own phase and
-- may reshape assignment_grades entirely; nothing here should be read as
-- that feature's real design.
--
-- Ownership model follows academic_calendars.sql exactly (the closest
-- existing precedent for teacher-owned, non-curriculum data): a
-- `profile_id` column on the top-level table, RLS via `profile_id =
-- auth.uid() or is_admin()`, and child tables walk up to that owner
-- through an EXISTS join rather than denormalizing — same pattern as
-- calendar_days under academic_calendars.

-- ── Classes + roster ─────────────────────────────────────────────────────

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  name text not null, -- e.g. "Period 3 Algebra I"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index classes_profile_id_idx on public.classes (profile_id);
create index classes_course_id_idx on public.classes (course_id);

create trigger classes_set_updated_at
  before update on public.classes
  for each row
  execute function public.set_updated_at();

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_class_id_idx on public.students (class_id);

create trigger students_set_updated_at
  before update on public.students
  for each row
  execute function public.set_updated_at();

alter table public.classes enable row level security;
alter table public.students enable row level security;

create policy classes_all on public.classes
  for all
  to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- students has no profile_id of its own — ownership is via its parent
-- classes row, same pattern as calendar_days under academic_calendars.
create policy students_all on public.students
  for all
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.classes c
      where c.id = students.class_id
        and c.profile_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.classes c
      where c.id = students.class_id
        and c.profile_id = auth.uid()
    )
  );

-- ── Assignments gain teks_ids ────────────────────────────────────────────
-- The semantic-matching suggestion feature applies to both lessons and
-- assignments, but assignments.sql (Phase 4) never added a teks_ids
-- column — lessons already had one. Same shape, same validation.

alter table public.assignments
  add column teks_ids uuid[] not null default '{}';

create or replace function public.validate_assignment_teks_ids()
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
    raise exception 'assignments.teks_ids contains % id(s) that do not exist in teks', missing_count;
  end if;

  return new;
end;
$$;

create trigger assignments_validate_teks_ids
  before insert or update of teks_ids on public.assignments
  for each row
  execute function public.validate_assignment_teks_ids();

-- ── Grades (minimal — just enough to power mastery auto-suggestion) ─────

create table public.assignment_grades (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  score_earned numeric(6, 2) not null check (score_earned >= 0),
  score_possible numeric(6, 2) not null check (score_possible > 0),
  graded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One grade per student per assignment — re-grading updates this row
  -- rather than accumulating duplicates.
  unique (assignment_id, student_id)
);

create index assignment_grades_assignment_id_idx on public.assignment_grades (assignment_id);
create index assignment_grades_student_id_idx on public.assignment_grades (student_id);

create trigger assignment_grades_set_updated_at
  before update on public.assignment_grades
  for each row
  execute function public.set_updated_at();

alter table public.assignment_grades enable row level security;

-- Ownership is two levels up (assignment_grades -> students -> classes),
-- same EXISTS-through-parent shape, just one join deeper.
create policy assignment_grades_all on public.assignment_grades
  for all
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = assignment_grades.student_id
        and c.profile_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = assignment_grades.student_id
        and c.profile_id = auth.uid()
    )
  );

-- ── TEKS mastery ──────────────────────────────────────────────────────────

create type public.teks_mastery_status as enum (
  'not_started',
  'introduced',
  'practiced',
  'assessed',
  'mastered',
  'needs_reteaching'
);

create table public.teks_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  -- References teks.code (already unique) rather than teks.id — the
  -- column name and shape the mastery-tracking spec asked for directly.
  teks_code text not null references public.teks (code),
  status public.teks_mastery_status not null default 'not_started',
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (student_id, teks_code)
);

create index teks_mastery_student_id_idx on public.teks_mastery (student_id);
create index teks_mastery_teks_code_idx on public.teks_mastery (teks_code);

create or replace function public.set_teks_mastery_last_updated()
returns trigger
language plpgsql
as $$
begin
  new.last_updated = now();
  return new;
end;
$$;

create trigger teks_mastery_set_last_updated
  before update on public.teks_mastery
  for each row
  execute function public.set_teks_mastery_last_updated();

alter table public.teks_mastery enable row level security;

create policy teks_mastery_all on public.teks_mastery
  for all
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = teks_mastery.student_id
        and c.profile_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = teks_mastery.student_id
        and c.profile_id = auth.uid()
    )
  );
