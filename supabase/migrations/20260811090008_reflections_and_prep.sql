-- Two lightweight, teacher-owned tools hanging off a lesson: post-lesson
-- reflections and a prep checklist. Both follow the same ownership shape
-- as academic_calendars/classes — a `profile_id` column checked against
-- `auth.uid()`, not admin-gated — since these are a teacher's own notes
-- about a lesson, not curriculum content itself. Multiple teachers can
-- teach the same admin-authored lesson and each keeps their own
-- reflection/prep items against it.

create type public.pacing_accuracy as enum (
  'too_fast',
  'just_right',
  'too_slow'
);

create type public.engagement_level as enum (
  'low',
  'medium',
  'high'
);

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  what_worked text,
  what_confused_students text,
  pacing_accuracy public.pacing_accuracy,
  engagement_level public.engagement_level,
  reteach_flag boolean not null default false,
  action_items text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One reflection per teacher per lesson — the quick-entry form is an
  -- upsert, refined lesson to lesson rather than accumulating a new row
  -- every time the teacher revisits it.
  unique (profile_id, lesson_id)
);

create index reflections_profile_id_idx on public.reflections (profile_id);
create index reflections_lesson_id_idx on public.reflections (lesson_id);

create trigger reflections_set_updated_at
  before update on public.reflections
  for each row
  execute function public.set_updated_at();

alter table public.reflections enable row level security;

create policy reflections_all on public.reflections
  for all
  to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create type public.prep_category as enum (
  'materials_to_print',
  'materials_to_cut',
  'tech_to_test',
  'supplies_needed'
);

create type public.prep_priority as enum (
  'low',
  'medium',
  'high'
);

create table public.prep_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  description text not null,
  category public.prep_category not null,
  due_date date,
  priority public.prep_priority not null default 'medium',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prep_items_profile_id_idx on public.prep_items (profile_id);
create index prep_items_lesson_id_idx on public.prep_items (lesson_id);
create index prep_items_due_date_idx on public.prep_items (due_date);

create trigger prep_items_set_updated_at
  before update on public.prep_items
  for each row
  execute function public.set_updated_at();

alter table public.prep_items enable row level security;

create policy prep_items_all on public.prep_items
  for all
  to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());
