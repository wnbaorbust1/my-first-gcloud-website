-- Profiles + shared helpers (updated_at trigger, is_admin()).
-- Every later migration that needs "is this user an admin?" or an
-- updated_at column reuses the functions defined here.

create extension if not exists pgcrypto;

-- ── Shared helpers ──────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles ─────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Denormalized copy of auth.users.email, kept in sync by the triggers
  -- below. Exists so server-side code can look up "does an account exist
  -- for this email" (used for the login "no account found" message and
  -- future admin search) without needing the auth admin API.
  email text not null,
  name text,
  school text,
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_key on public.profiles (lower(email));
-- Plain (non-functional) index so a straight `email = $1` lookup — e.g.
-- the login "does this account exist" check — can use an index scan
-- instead of a sequential one. Callers are expected to pass an
-- already-lowercased email (Supabase Auth stores/normalizes it that way).
create index profiles_email_lookup_idx on public.profiles (email);

comment on table public.profiles is
  'One row per auth.users row. role/subscription_status/email are privileged '
  'columns — see protect_profile_privileged_columns(); regular users cannot '
  'change them via the API, only the triggers below or an admin can.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- is_admin() is SECURITY DEFINER so it can read public.profiles without
-- being subject to the RLS policies defined on that same table below —
-- without this, any policy that calls is_admin() would recurse into RLS
-- on profiles again and fail (or deadlock the policy planner).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Create a profile row automatically whenever a new auth user is created.
-- Pulls name/school from signup metadata when present (email/password
-- signup passes these; Google OAuth populates full_name/name instead, so
-- we check both).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, school)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'school'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Keep profiles.email in sync if a user ever changes their auth email.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  execute function public.handle_user_email_change();

-- Prevent a regular user from granting themselves admin, faking their own
-- subscription status, or drifting profiles.email away from their real
-- auth email — those three columns are only ever written by the triggers
-- above, an admin, or a privileged backend context.
--
-- current_user <> 'authenticated' is the bypass for service_role (Stripe
-- webhooks, admin backend jobs — billing phase) and for postgres itself
-- (migrations, SQL editor, and any SECURITY DEFINER function such as
-- handle_user_email_change() above, which executes as its owner). Without
-- that check, only an app-level admin could ever legitimately write these
-- columns, and even the service-role client would get silently overridden
-- back to the old values — which would quietly break subscription status
-- updates once billing lands.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user <> 'authenticated' or public.is_admin() then
    return new;
  end if;

  new.role := old.role;
  new.subscription_status := old.subscription_status;
  new.email := old.email;
  return new;
end;
$$;

create trigger profiles_protect_privileged_columns
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileged_columns();

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- Row creation happens exclusively via handle_new_user() (SECURITY
-- DEFINER, bypasses RLS), so there is no INSERT policy for regular users.
create policy profiles_insert_admin on public.profiles
  for insert
  to authenticated
  with check (public.is_admin());

create policy profiles_update on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy profiles_delete_admin on public.profiles
  for delete
  to authenticated
  using (public.is_admin());
