-- Units: the top-level curriculum groupings within a course (e.g. "Unit 3:
-- Linear Functions"). A course's 36-week year is organized into units,
-- each spanning one or more weeks (see weeks.sql).

create table public.units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  unit_number integer not null check (unit_number > 0),
  title text not null,
  teks_focus_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, unit_number)
);

create index units_course_id_idx on public.units (course_id);

create trigger units_set_updated_at
  before update on public.units
  for each row
  execute function public.set_updated_at();

-- A unit's course is fixed at creation. Reorganizing within a course
-- (renumbering units, moving weeks between units) is a real workflow;
-- moving a unit to a *different* course is not — delete and recreate it
-- there instead. This also means weeks/lessons can safely denormalize
-- course_id from their parent without ever needing to cascade an update
-- past one level (see weeks.sql / lessons.sql).
create or replace function public.prevent_unit_course_reassignment()
returns trigger
language plpgsql
as $$
begin
  if new.course_id is distinct from old.course_id then
    raise exception 'units.course_id cannot be changed after creation — delete and recreate the unit under the new course instead';
  end if;
  return new;
end;
$$;

create trigger units_lock_course_id
  before update on public.units
  for each row
  execute function public.prevent_unit_course_reassignment();

alter table public.units enable row level security;

-- Structural browsing (course → units) doesn't require an active
-- subscription — it's the shape of the curriculum, not the curriculum
-- itself. Lesson *content* is what's subscription-gated (see lessons.sql).
-- Signed-in only, unlike courses' anon-readable catalog listing.
create policy units_select_authenticated on public.units
  for select
  to authenticated
  using (true);

create policy units_insert_admin on public.units
  for insert
  to authenticated
  with check (public.is_admin());

create policy units_update_admin on public.units
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy units_delete_admin on public.units
  for delete
  to authenticated
  using (public.is_admin());
