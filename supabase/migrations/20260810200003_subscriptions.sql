-- Subscriptions. Regular users can only ever SELECT their own row — writes
-- happen server-side (Stripe webhooks, using the service-role key, which
-- bypasses RLS entirely) or by an admin. This lands fully in the billing
-- phase; this migration just gets the shape in place.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  tier text not null check (tier in ('full_year', 'one_course', 'two_course')),
  status text not null default 'incomplete'
    check (status in ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  -- Which courses this subscription unlocks. Empty for 'full_year' (that
  -- tier implies all 8 by definition); exactly 1 / 2 entries for the
  -- narrower tiers, enforced below.
  course_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_course_ids_match_tier check (
    (tier = 'full_year' and coalesce(array_length(course_ids, 1), 0) = 0)
    or (tier = 'one_course' and array_length(course_ids, 1) = 1)
    or (tier = 'two_course' and array_length(course_ids, 1) = 2)
  )
);

create index subscriptions_profile_id_idx on public.subscriptions (profile_id);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy subscriptions_select on public.subscriptions
  for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy subscriptions_write_admin on public.subscriptions
  for insert
  to authenticated
  with check (public.is_admin());

create policy subscriptions_update_admin on public.subscriptions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy subscriptions_delete_admin on public.subscriptions
  for delete
  to authenticated
  using (public.is_admin());

-- Centralizes "does this teacher currently have access to this course" so
-- future content tables (lessons, assignments, etc. — curriculum phase)
-- can gate reads with a one-line policy:
--   using (public.has_course_access(course_id))
-- No callers yet.
create or replace function public.has_course_access(target_course_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.subscriptions s
      where s.profile_id = auth.uid()
        and s.status in ('trialing', 'active')
        and (s.tier = 'full_year' or target_course_id = any (s.course_ids))
    );
$$;
