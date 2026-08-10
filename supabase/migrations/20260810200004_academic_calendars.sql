-- Teacher-specific academic calendars: one calendar per teacher per school
-- year, with individual dated day types underneath.

create table public.academic_calendars (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  school_year_label text not null, -- e.g. '2026-2027'
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, school_year_label),
  constraint academic_calendars_dates_ordered check (end_date > start_date)
);

create trigger academic_calendars_set_updated_at
  before update on public.academic_calendars
  for each row
  execute function public.set_updated_at();

create type public.calendar_day_type as enum (
  'regular',
  'holiday',
  'testing',
  'early_release',
  'block_day'
);

create table public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  academic_calendar_id uuid not null references public.academic_calendars (id) on delete cascade,
  date date not null,
  day_type public.calendar_day_type not null default 'regular',
  label text,
  created_at timestamptz not null default now(),
  unique (academic_calendar_id, date)
);

create index calendar_days_academic_calendar_id_idx on public.calendar_days (academic_calendar_id);

alter table public.academic_calendars enable row level security;
alter table public.calendar_days enable row level security;

create policy academic_calendars_all on public.academic_calendars
  for all
  to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- calendar_days has no profile_id of its own — ownership is via its
-- parent academic_calendars row.
create policy calendar_days_all on public.calendar_days
  for all
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.academic_calendars ac
      where ac.id = calendar_days.academic_calendar_id
        and ac.profile_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.academic_calendars ac
      where ac.id = calendar_days.academic_calendar_id
        and ac.profile_id = auth.uid()
    )
  );
