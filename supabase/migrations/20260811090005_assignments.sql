-- Assignments: coursework belonging to a unit (not a specific week/day —
-- a teacher assigns a project or worksheet whenever it fits their pacing,
-- unlike lessons which are pinned to one class period). 20 assignment
-- types cover a typical high school course's toolkit.
--
-- Structurally this mirrors lessons.sql: denormalized course_id from the
-- parent (units, here — one level up from lessons' weeks), a draft/
-- published status, and a publish-gate trigger that only enforces
-- completeness once status = 'published'. The one real difference is the
-- rubric: lessons needed a normalized child table for lesson_segments
-- (queryable duration_minutes, unique per segment_key); a rubric's
-- criteria don't need that — jsonb is the right fit, validated by trigger
-- since Postgres can't constrain the shape of array elements otherwise.

create type public.assignment_type as enum (
  'classwork',
  'homework',
  'project',
  'guided_notes',
  'worksheet',
  'spreadsheet',
  'card_sort',
  'simulation',
  'game',
  'case_study',
  'research',
  'presentation',
  'exit_ticket',
  'quiz',
  'test',
  'lab_investigation',
  'debate',
  'socratic_seminar',
  'reflection_journal',
  'peer_review'
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  -- Denormalized from units.course_id — see set_assignment_course_id()
  -- below. Never set directly; recomputed from unit_id on every write.
  course_id uuid not null references public.courses (id) on delete cascade,
  assignment_type public.assignment_type not null,
  title text not null,

  -- Student-facing prompt/directions — what the student actually reads.
  instructions text,
  -- Teacher-facing setup notes: materials, timing, differentiation tips.
  -- Never shown to students, so it isn't subject to the same "must read
  -- cleanly on its own" bar as instructions.
  teacher_directions text,

  -- Structured rubric: a jsonb array of {criterion, points, description?}
  -- objects. Shape is validated by validate_assignment_rubric() below on
  -- every write (not just at publish) so garbage never lands in the
  -- column even while drafting; *completeness* (non-empty) is a
  -- publish-only requirement, enforced by check_assignment_publishable().
  rubric jsonb not null default '[]'::jsonb,

  answer_key text,

  status text not null default 'draft' check (status in ('draft', 'published')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assignments_unit_id_idx on public.assignments (unit_id);
create index assignments_course_id_idx on public.assignments (course_id);
create index assignments_status_idx on public.assignments (status);
create index assignments_type_idx on public.assignments (assignment_type);

create trigger assignments_set_updated_at
  before update on public.assignments
  for each row
  execute function public.set_updated_at();

create or replace function public.set_assignment_course_id()
returns trigger
language plpgsql
as $$
begin
  select course_id into new.course_id
  from public.units
  where id = new.unit_id;

  if new.course_id is null then
    raise exception 'assignments.unit_id % does not reference an existing unit', new.unit_id;
  end if;

  return new;
end;
$$;

create trigger assignments_set_course_id
  before insert or update of unit_id on public.assignments
  for each row
  execute function public.set_assignment_course_id();

-- Shape validation for the rubric jsonb: must be an array of objects,
-- each with a non-empty "criterion" string and a positive numeric
-- "points". Runs on every write so a malformed rubric never lands in the
-- column at all — independent of the draft/published completeness gate
-- below, same split as lessons' teks_ids validation vs. its publish gate.
create or replace function public.validate_assignment_rubric()
returns trigger
language plpgsql
as $$
declare
  item jsonb;
begin
  if jsonb_typeof(new.rubric) is distinct from 'array' then
    raise exception 'assignments.rubric must be a jsonb array, got %', jsonb_typeof(new.rubric);
  end if;

  for item in select * from jsonb_array_elements(new.rubric)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception 'assignments.rubric elements must be objects, got %', jsonb_typeof(item);
    end if;

    -- `item -> key` on a missing key returns SQL NULL, and jsonb_typeof(NULL)
    -- is itself NULL — so "IS DISTINCT FROM" (not "<>") to actually catch a
    -- missing key rather than silently passing on a NULL-vs-NULL comparison.
    if jsonb_typeof(item -> 'criterion') is distinct from 'string' or btrim(item ->> 'criterion') = '' then
      raise exception 'assignments.rubric elements must have a non-empty "criterion" string';
    end if;

    if jsonb_typeof(item -> 'points') is distinct from 'number' or (item ->> 'points')::numeric <= 0 then
      raise exception 'assignments.rubric elements must have a positive numeric "points" value';
    end if;
  end loop;

  return new;
end;
$$;

create trigger assignments_validate_rubric
  before insert or update of rubric on public.assignments
  for each row
  execute function public.validate_assignment_rubric();

-- Publish gate: a finished assignment needs a title, student-facing
-- instructions, teacher directions, a non-empty rubric, and an answer
-- key. Drafts can be as incomplete as the author likes. Fires on every
-- insert/update (not just "of status") so editing a published assignment
-- down to an invalid state — e.g. blanking instructions — is caught too.
create or replace function public.check_assignment_publishable()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'published' then
    return new;
  end if;

  if btrim(new.title) = '' then
    raise exception 'assignment % cannot be published without a title', new.id;
  end if;

  if new.instructions is null or btrim(new.instructions) = '' then
    raise exception 'assignment % cannot be published without student-facing instructions', new.id;
  end if;

  if new.teacher_directions is null or btrim(new.teacher_directions) = '' then
    raise exception 'assignment % cannot be published without teacher directions', new.id;
  end if;

  if jsonb_array_length(new.rubric) = 0 then
    raise exception 'assignment % cannot be published without at least one rubric criterion', new.id;
  end if;

  if new.answer_key is null or btrim(new.answer_key) = '' then
    raise exception 'assignment % cannot be published without an answer key', new.id;
  end if;

  return new;
end;
$$;

create trigger assignments_check_publishable
  before insert or update on public.assignments
  for each row
  execute function public.check_assignment_publishable();

alter table public.assignments enable row level security;

-- Same visibility split as lessons: admins see everything; teachers only
-- see published assignments in courses they have active access to.
create policy assignments_select on public.assignments
  for select
  to authenticated
  using (
    public.is_admin()
    or (status = 'published' and public.has_course_access(course_id))
  );

create policy assignments_insert_admin on public.assignments
  for insert
  to authenticated
  with check (public.is_admin());

create policy assignments_update_admin on public.assignments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy assignments_delete_admin on public.assignments
  for delete
  to authenticated
  using (public.is_admin());
