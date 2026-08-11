-- Assessments + the real gradebook.
--
-- SCHEMA RECONCILIATION NOTE: the previous phase's `assignment_grades`
-- table (student_id, assignment_id, score_earned, score_possible,
-- graded_at) was explicitly called out as "not the future gradebook
-- feature." This migration IS that feature — a single `grades` table
-- covering both assessments and assignments (student_id + exactly one of
-- assessment_id/assignment_id + score/max_score/date), per this phase's
-- spec. assignment_grades' data is migrated into it and the old table is
-- dropped rather than left as a second, competing source of truth.
--
-- `students` also gains `teacher_id` and `class_period` directly, per
-- this phase's spec — `teacher_id` is denormalized from class_id exactly
-- like course_id is denormalized from unit_id/week_id elsewhere, so
-- gradebook/RLS reads here don't need a join through classes at all.
-- `class_id` is NOT removed: it's still what actually scopes a roster to
-- a course (teks-mastery's dashboard depends on it), `class_period` is
-- just the free-text label ("Period 3") this phase asked for alongside it.

-- ── Assessments ───────────────────────────────────────────────────────────

create type public.question_type as enum (
  'multiple_choice',
  'true_false',
  'matching',
  'calculation',
  'short_response',
  'scenario_analysis',
  'essay',
  'performance_task'
);

-- original: authored directly. retake: a regenerated variant covering the
-- same TEKS/skills with different questions (same difficulty). modified:
-- an accommodations variant of the SAME questions (simplified language /
-- reduced choices). Every retake/modified row points back to the
-- assessment it was generated from via source_assessment_id.
create type public.assessment_variant as enum (
  'original',
  'retake',
  'modified'
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  -- Denormalized from units.course_id, same pattern as weeks/lessons/assignments.
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,

  -- A jsonb array of question objects. Shape is intentionally loose
  -- across the 8 question types (multiple_choice needs `options`,
  -- matching needs `pairs`, essay/performance_task need neither) — see
  -- validate_assessment_questions() below for what IS enforced
  -- structurally (every element has a valid type/prompt/points) versus
  -- what's left to the app layer (per-type shape).
  questions jsonb not null default '[]'::jsonb,
  answer_key text,

  -- References teks.id — same validated-by-trigger pattern as
  -- lessons.teks_ids / assignments.teks_ids, added here from the start
  -- rather than bolted on later, so the gradebook's per-TEKS-code trend
  -- view works for assessment grades too, not just assignment grades.
  teks_ids uuid[] not null default '{}',

  status text not null default 'draft' check (status in ('draft', 'published')),

  variant_type public.assessment_variant not null default 'original',
  source_assessment_id uuid references public.assessments (id) on delete set null,
  constraint assessments_variant_source_consistency check (
    (variant_type = 'original' and source_assessment_id is null)
    or (variant_type in ('retake', 'modified') and source_assessment_id is not null)
  ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessments_unit_id_idx on public.assessments (unit_id);
create index assessments_course_id_idx on public.assessments (course_id);
create index assessments_status_idx on public.assessments (status);
create index assessments_source_assessment_id_idx on public.assessments (source_assessment_id);

create trigger assessments_set_updated_at
  before update on public.assessments
  for each row
  execute function public.set_updated_at();

create or replace function public.set_assessment_course_id()
returns trigger
language plpgsql
as $$
begin
  select course_id into new.course_id
  from public.units
  where id = new.unit_id;

  if new.course_id is null then
    raise exception 'assessments.unit_id % does not reference an existing unit', new.unit_id;
  end if;

  return new;
end;
$$;

create trigger assessments_set_course_id
  before insert or update of unit_id on public.assessments
  for each row
  execute function public.set_assessment_course_id();

create or replace function public.validate_assessment_teks_ids()
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
    raise exception 'assessments.teks_ids contains % id(s) that do not exist in teks', missing_count;
  end if;

  return new;
end;
$$;

create trigger assessments_validate_teks_ids
  before insert or update of teks_ids on public.assessments
  for each row
  execute function public.validate_assessment_teks_ids();

-- Structural validation only: every element is an object with a valid
-- `type`, a non-empty `prompt`, and positive `points`. Per-type shape
-- (multiple_choice's `options`, matching's `pairs`, etc.) is validated by
-- the Zod schema at the AI-generation and editor-save boundaries instead
-- — enforcing it here too would mean hard-coding 8 different shapes into
-- SQL for marginal benefit, the same trade-off assignments.rubric made.
create or replace function public.validate_assessment_questions()
returns trigger
language plpgsql
as $$
declare
  item jsonb;
begin
  if jsonb_typeof(new.questions) is distinct from 'array' then
    raise exception 'assessments.questions must be a jsonb array, got %', jsonb_typeof(new.questions);
  end if;

  for item in select * from jsonb_array_elements(new.questions)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'assessments.questions elements must be objects, got %', jsonb_typeof(item);
    end if;

    if jsonb_typeof(item -> 'type') is distinct from 'string'
       or (item ->> 'type') not in (
         'multiple_choice', 'true_false', 'matching', 'calculation',
         'short_response', 'scenario_analysis', 'essay', 'performance_task'
       ) then
      raise exception 'assessments.questions elements must have a valid "type"';
    end if;

    if jsonb_typeof(item -> 'prompt') is distinct from 'string' or btrim(item ->> 'prompt') = '' then
      raise exception 'assessments.questions elements must have a non-empty "prompt" string';
    end if;

    if jsonb_typeof(item -> 'points') is distinct from 'number' or (item ->> 'points')::numeric <= 0 then
      raise exception 'assessments.questions elements must have a positive numeric "points" value';
    end if;
  end loop;

  return new;
end;
$$;

create trigger assessments_validate_questions
  before insert or update of questions on public.assessments
  for each row
  execute function public.validate_assessment_questions();

-- Publish gate: mirrors assignments' — title, at least one question, and
-- an answer key. Drafts (including every retake/modified variant while
-- it's being reviewed) can be incomplete.
create or replace function public.check_assessment_publishable()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'published' then
    return new;
  end if;

  if btrim(new.title) = '' then
    raise exception 'assessment % cannot be published without a title', new.id;
  end if;

  if jsonb_array_length(new.questions) = 0 then
    raise exception 'assessment % cannot be published without at least one question', new.id;
  end if;

  if new.answer_key is null or btrim(new.answer_key) = '' then
    raise exception 'assessment % cannot be published without an answer key', new.id;
  end if;

  return new;
end;
$$;

create trigger assessments_check_publishable
  before insert or update on public.assessments
  for each row
  execute function public.check_assessment_publishable();

alter table public.assessments enable row level security;

-- Admin-authored curriculum content, identical visibility split to
-- lessons/assignments — NOT teacher-owned data (that's classes/students/
-- grades below).
create policy assessments_select on public.assessments
  for select
  to authenticated
  using (
    public.is_admin()
    or (status = 'published' and public.has_course_access(course_id))
  );

create policy assessments_insert_admin on public.assessments
  for insert
  to authenticated
  with check (public.is_admin());

create policy assessments_update_admin on public.assessments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy assessments_delete_admin on public.assessments
  for delete
  to authenticated
  using (public.is_admin());

-- ── students gain teacher_id + class_period ─────────────────────────────

alter table public.students
  add column teacher_id uuid references public.profiles (id) on delete cascade,
  add column class_period text;

update public.students s
set teacher_id = c.profile_id
from public.classes c
where c.id = s.class_id
  and s.teacher_id is null;

alter table public.students
  alter column teacher_id set not null;

create index students_teacher_id_idx on public.students (teacher_id);

create or replace function public.set_student_teacher_id()
returns trigger
language plpgsql
as $$
begin
  select profile_id into new.teacher_id
  from public.classes
  where id = new.class_id;

  if new.teacher_id is null then
    raise exception 'students.class_id % does not reference an existing class', new.class_id;
  end if;

  return new;
end;
$$;

create trigger students_set_teacher_id
  before insert or update of class_id on public.students
  for each row
  execute function public.set_student_teacher_id();

-- ── Unified grades table ─────────────────────────────────────────────────

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  assessment_id uuid references public.assessments (id) on delete cascade,
  assignment_id uuid references public.assignments (id) on delete cascade,
  score numeric(6, 2) not null check (score >= 0),
  max_score numeric(6, 2) not null check (max_score > 0),
  date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grades_exactly_one_item check (
    num_nonnulls(assessment_id, assignment_id) = 1
  )
);

-- Partial unique indexes rather than a table-wide UNIQUE(student_id,
-- assessment_id, assignment_id): with one FK always null, a plain unique
-- constraint across all three wouldn't stop a student from getting two
-- grade rows on the same assessment (both rows would differ only in
-- their always-null assignment_id, which a standard unique constraint
-- treats as distinct). Filtering to "the FK that's actually set" per
-- index is what actually enforces "one grade per student per item."
create unique index grades_student_assessment_uidx
  on public.grades (student_id, assessment_id)
  where assessment_id is not null;
create unique index grades_student_assignment_uidx
  on public.grades (student_id, assignment_id)
  where assignment_id is not null;

create index grades_student_id_idx on public.grades (student_id);
create index grades_assessment_id_idx on public.grades (assessment_id);
create index grades_assignment_id_idx on public.grades (assignment_id);
create index grades_date_idx on public.grades (date);

create trigger grades_set_updated_at
  before update on public.grades
  for each row
  execute function public.set_updated_at();

alter table public.grades enable row level security;

create policy grades_all on public.grades
  for all
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.students s
      where s.id = grades.student_id
        and s.teacher_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.students s
      where s.id = grades.student_id
        and s.teacher_id = auth.uid()
    )
  );

-- Migrate assignment_grades' data across, then retire it — see the note
-- at the top of this file for why this isn't kept as a second table.
insert into public.grades (student_id, assignment_id, score, max_score, date, created_at, updated_at)
select student_id, assignment_id, score_earned, score_possible, graded_at::date, created_at, updated_at
from public.assignment_grades;

drop table public.assignment_grades;
