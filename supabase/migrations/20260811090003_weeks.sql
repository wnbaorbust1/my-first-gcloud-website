-- Weeks: one row per school-year week (1-36) within a course, nested
-- under a unit. week_number is scoped to the *course*, not the unit, so
-- "week 12" means the same thing everywhere in that course's calendar
-- regardless of which unit currently contains it.

create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  -- Denormalized from units.course_id — see set_week_course_id() below.
  -- Never set this directly; it's recomputed from unit_id on every write,
  -- and exists so lessons/RLS below don't need a join through units.
  course_id uuid not null references public.courses (id) on delete cascade,
  week_number integer not null check (week_number between 1 and 36),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, week_number)
);

create index weeks_unit_id_idx on public.weeks (unit_id);
create index weeks_course_id_idx on public.weeks (course_id);

create trigger weeks_set_updated_at
  before update on public.weeks
  for each row
  execute function public.set_updated_at();

create or replace function public.set_week_course_id()
returns trigger
language plpgsql
as $$
begin
  select course_id into new.course_id
  from public.units
  where id = new.unit_id;

  if new.course_id is null then
    raise exception 'weeks.unit_id % does not reference an existing unit', new.unit_id;
  end if;

  return new;
end;
$$;

create trigger weeks_set_course_id
  before insert or update of unit_id on public.weeks
  for each row
  execute function public.set_week_course_id();

alter table public.weeks enable row level security;

create policy weeks_select_authenticated on public.weeks
  for select
  to authenticated
  using (true);

create policy weeks_insert_admin on public.weeks
  for insert
  to authenticated
  with check (public.is_admin());

create policy weeks_update_admin on public.weeks
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy weeks_delete_admin on public.weeks
  for delete
  to authenticated
  using (public.is_admin());
