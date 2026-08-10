-- Lessons: one 70-minute class period, belonging to a week. day_number
-- (1-5, Mon-Fri) identifies which day of that week it is — the natural
-- key a week's ~5 lessons are ordered and displayed by.
--
-- This is the actual valuable curriculum content, unlike units/weeks:
-- reads are gated by both publish status AND active course subscription
-- (see the RLS policies at the bottom of this file).

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks (id) on delete cascade,
  -- Denormalized from weeks.course_id — see set_lesson_course_id() below.
  -- Lets the RLS policy check subscription access with no join at all.
  course_id uuid not null references public.courses (id) on delete cascade,
  day_number integer not null check (day_number between 1 and 5), -- Mon=1 .. Fri=5
  title text not null,

  -- Gradual release of responsibility: I do / We do / You do together /
  -- You do. Plain text (markdown at the author's discretion) — an editor
  -- can render it richly later without a schema change.
  i_do text,
  we_do text,
  you_do_together text,
  you_do text,

  -- QSSSA discussion framework: Question, Signal, Stem, Share, Assess.
  qsssa_question text,
  qsssa_signal text,
  qsssa_stem text,
  qsssa_share text,
  qsssa_assess text,

  -- Exactly 5 required to publish (see check_lesson_publishable() below);
  -- capped at 5 even while drafting so an obviously-wrong count is caught
  -- immediately rather than at publish time.
  homework text[] not null default '{}',

  -- References teks.id. Postgres can't FK-constrain individual array
  -- elements, so this is validated by validate_lesson_teks_ids() below.
  teks_ids uuid[] not null default '{}',

  status text not null default 'draft' check (status in ('draft', 'published')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (week_id, day_number),
  constraint lessons_homework_max_5 check (coalesce(array_length(homework, 1), 0) <= 5)
);

create index lessons_week_id_idx on public.lessons (week_id);
create index lessons_course_id_idx on public.lessons (course_id);
create index lessons_status_idx on public.lessons (status);

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row
  execute function public.set_updated_at();

create or replace function public.set_lesson_course_id()
returns trigger
language plpgsql
as $$
begin
  select course_id into new.course_id
  from public.weeks
  where id = new.week_id;

  if new.course_id is null then
    raise exception 'lessons.week_id % does not reference an existing week', new.week_id;
  end if;

  return new;
end;
$$;

create trigger lessons_set_course_id
  before insert or update of week_id on public.lessons
  for each row
  execute function public.set_lesson_course_id();

create or replace function public.validate_lesson_teks_ids()
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
    raise exception 'lessons.teks_ids contains % id(s) that do not exist in teks', missing_count;
  end if;

  return new;
end;
$$;

create trigger lessons_validate_teks_ids
  before insert or update of teks_ids on public.lessons
  for each row
  execute function public.validate_lesson_teks_ids();

-- Publishing gate: everything a finished lesson needs — all 6
-- class-period segments totaling 70 minutes (checked against
-- lesson_segments, inserted separately below), all four gradual-release
-- stages, all five QSSSA fields, exactly 5 homework questions, at least
-- one TEKS code — is only enforced at the moment status = 'published'.
-- Drafts can be as incomplete as the author likes while building them out.
--
-- Fires on every insert/update (not just "of status"), so editing an
-- already-published lesson down to an invalid state — e.g. blanking
-- i_do — is caught immediately too, not just on the status transition.
create or replace function public.check_lesson_publishable()
returns trigger
language plpgsql
as $$
declare
  segment_count integer;
  total_minutes integer;
begin
  if new.status <> 'published' then
    return new;
  end if;

  select count(*), coalesce(sum(duration_minutes), 0)
    into segment_count, total_minutes
    from public.lesson_segments
    where lesson_id = new.id;

  if segment_count <> 6 then
    raise exception 'lesson % cannot be published without all 6 class-period segments (found %)', new.id, segment_count;
  end if;

  if total_minutes <> 70 then
    raise exception 'lesson % class-period segments must total 70 minutes to publish (found %)', new.id, total_minutes;
  end if;

  if new.i_do is null or btrim(new.i_do) = ''
     or new.we_do is null or btrim(new.we_do) = ''
     or new.you_do_together is null or btrim(new.you_do_together) = ''
     or new.you_do is null or btrim(new.you_do) = '' then
    raise exception 'lesson % cannot be published without all four gradual-release fields (i_do/we_do/you_do_together/you_do)', new.id;
  end if;

  if new.qsssa_question is null or btrim(new.qsssa_question) = ''
     or new.qsssa_signal is null or btrim(new.qsssa_signal) = ''
     or new.qsssa_stem is null or btrim(new.qsssa_stem) = ''
     or new.qsssa_share is null or btrim(new.qsssa_share) = ''
     or new.qsssa_assess is null or btrim(new.qsssa_assess) = '' then
    raise exception 'lesson % cannot be published without all five QSSSA fields', new.id;
  end if;

  if coalesce(array_length(new.homework, 1), 0) <> 5 then
    raise exception 'lesson % must have exactly 5 homework questions to publish (found %)', new.id, coalesce(array_length(new.homework, 1), 0);
  end if;

  if coalesce(array_length(new.teks_ids, 1), 0) = 0 then
    raise exception 'lesson % must have at least one TEKS code to publish', new.id;
  end if;

  return new;
end;
$$;

-- Class-period segments: bell_ringer, mini_lesson, modeling, activity,
-- debrief, exit_ticket — the bell-to-bell schedule for a lesson's 70
-- minutes. A normalized child table (not JSONB) so duration/ordering are
-- real, queryable, constrainable columns.

create type public.lesson_segment_key as enum (
  'bell_ringer',
  'mini_lesson',
  'modeling',
  'activity',
  'debrief',
  'exit_ticket'
);

create table public.lesson_segments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  segment_key public.lesson_segment_key not null,
  title text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, segment_key)
);

create index lesson_segments_lesson_id_idx on public.lesson_segments (lesson_id);

create trigger lesson_segments_set_updated_at
  before update on public.lesson_segments
  for each row
  execute function public.set_updated_at();

-- Now that lesson_segments exists, check_lesson_publishable() (defined
-- above, attached below) can actually query it.
create trigger lessons_check_publishable
  before insert or update on public.lessons
  for each row
  execute function public.check_lesson_publishable();

-- Mirrors check_lesson_publishable() from the other direction: once a
-- lesson is published, its segments can't be edited/removed down to an
-- invalid state. DEFERRABLE INITIALLY DEFERRED so a single transaction
-- can replace all 6 segments at once (e.g. AI regenerating a lesson —
-- delete 6, insert 6) without tripping over the mid-transaction gap.
create or replace function public.check_lesson_segments_stay_valid()
returns trigger
language plpgsql
as $$
declare
  target_lesson_id uuid;
  lesson_status text;
  segment_count integer;
  total_minutes integer;
begin
  target_lesson_id := coalesce(new.lesson_id, old.lesson_id);

  select status into lesson_status from public.lessons where id = target_lesson_id;

  if lesson_status is distinct from 'published' then
    return null;
  end if;

  select count(*), coalesce(sum(duration_minutes), 0)
    into segment_count, total_minutes
    from public.lesson_segments
    where lesson_id = target_lesson_id;

  if segment_count <> 6 then
    raise exception 'lesson % is published and must keep all 6 class-period segments (found %)', target_lesson_id, segment_count;
  end if;

  if total_minutes <> 70 then
    raise exception 'lesson % is published and its segments must total 70 minutes (found %)', target_lesson_id, total_minutes;
  end if;

  return null;
end;
$$;

create constraint trigger lesson_segments_stay_valid
  after insert or update or delete on public.lesson_segments
  deferrable initially deferred
  for each row
  execute function public.check_lesson_segments_stay_valid();

alter table public.lessons enable row level security;
alter table public.lesson_segments enable row level security;

create policy lessons_select on public.lessons
  for select
  to authenticated
  using (
    public.is_admin()
    or (status = 'published' and public.has_course_access(course_id))
  );

create policy lessons_insert_admin on public.lessons
  for insert
  to authenticated
  with check (public.is_admin());

create policy lessons_update_admin on public.lessons
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy lessons_delete_admin on public.lessons
  for delete
  to authenticated
  using (public.is_admin());

create policy lesson_segments_select on public.lesson_segments
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.lessons l
      where l.id = lesson_segments.lesson_id
        and l.status = 'published'
        and public.has_course_access(l.course_id)
    )
  );

create policy lesson_segments_insert_admin on public.lesson_segments
  for insert
  to authenticated
  with check (public.is_admin());

create policy lesson_segments_update_admin on public.lesson_segments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy lesson_segments_delete_admin on public.lesson_segments
  for delete
  to authenticated
  using (public.is_admin());
