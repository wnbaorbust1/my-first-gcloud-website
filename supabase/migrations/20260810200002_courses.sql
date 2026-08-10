-- The 8 fixed subjects. Catalog metadata only — not sensitive, so it's
-- readable by anyone (including signed-out visitors, for a future
-- marketing/course-list page). Only admins can change it.

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  -- Hex color for this course's small tag/icon accent, matching the
  -- --accent-<slug> CSS variables in app/globals.css. Never used as a
  -- full background per the design system.
  accent_color text not null check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  week_count integer not null default 36 check (week_count > 0),
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger courses_set_updated_at
  before update on public.courses
  for each row
  execute function public.set_updated_at();

alter table public.courses enable row level security;

create policy courses_select_all on public.courses
  for select
  to anon, authenticated
  using (true);

create policy courses_write_admin on public.courses
  for insert
  to authenticated
  with check (public.is_admin());

create policy courses_update_admin on public.courses
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy courses_delete_admin on public.courses
  for delete
  to authenticated
  using (public.is_admin());

insert into public.courses (slug, display_name, accent_color, sort_order) values
  ('money-matters',       'Money Matters',       '#4f7a6b', 1),
  ('dollars-and-sense',   'Dollars & Sense',      '#8a6bb1', 2),
  ('algebra-1',           'Algebra I',            '#3f7ab0', 3),
  ('biology',             'Biology',              '#5f8a3f', 4),
  ('english-1',           'English I',            '#b0553f', 5),
  ('us-history',          'US History',           '#a3833f', 6),
  ('accounting-1',        'Accounting I',         '#3f8a86', 7),
  ('accounting-2',        'Accounting II',        '#8a5f3f', 8)
on conflict (slug) do nothing;
