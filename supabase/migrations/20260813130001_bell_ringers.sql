-- Bell ringers: a lightweight, on-the-fly generator for teachers to use
-- directly (unlike lessons/assignments/assessments, which are admin-
-- authored library content) — spontaneous, personal to each teacher's own
-- pacing, so ownership follows the academic_calendars/classes pattern
-- (profile_id + RLS `profile_id = auth.uid() or is_admin()`) rather than
-- the admin-only content tables.

create table public.bell_ringers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  -- Optional: this bell ringer is tied to a specific lesson (e.g. "today's
  -- warm-up"). Set null (not cascaded away) if that lesson is later
  -- removed — the bell ringer is the teacher's own record.
  lesson_id uuid references public.lessons (id) on delete set null,
  -- Short AI-written label for the history list — always set. `topic` is
  -- the teacher's own typed input and is null in spiral-review mode
  -- (there's nothing they typed; the AI picked the standard to review).
  title text not null,
  topic text,
  prompt_text text not null,
  answer_key text not null,
  -- Same convention as lessons.teks_ids / assignments.teks_ids (uuid[]
  -- referencing teks.id, validated below) rather than teks_mastery's
  -- text-code column — this is content tagging, not a mastery record.
  teks_ids uuid[] not null default '{}',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bell_ringers_profile_id_idx on public.bell_ringers (profile_id);
create index bell_ringers_course_id_idx on public.bell_ringers (course_id);

create trigger bell_ringers_set_updated_at
  before update on public.bell_ringers
  for each row
  execute function public.set_updated_at();

-- Same shape as validate_lesson_teks_ids() / validate_assignment_teks_ids()
-- — one validator per table, matching this codebase's existing convention,
-- rather than a shared generic function.
create or replace function public.validate_bell_ringer_teks_ids()
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
    raise exception 'bell_ringers.teks_ids contains % id(s) that do not exist in teks', missing_count;
  end if;

  return new;
end;
$$;

create trigger bell_ringers_validate_teks_ids
  before insert or update of teks_ids on public.bell_ringers
  for each row
  execute function public.validate_bell_ringer_teks_ids();

alter table public.bell_ringers enable row level security;

create policy bell_ringers_all on public.bell_ringers
  for all
  to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());
