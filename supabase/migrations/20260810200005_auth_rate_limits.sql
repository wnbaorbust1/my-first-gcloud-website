-- Backing store for app-level auth rate limiting (see lib/auth/rate-limit.ts).
-- Deliberately has NO policies after enabling RLS: this table is only ever
-- read/written by the service-role client (which bypasses RLS entirely),
-- so "enable RLS, grant nothing" makes it inaccessible via the anon/
-- authenticated PostgREST roles even if it were exposed by mistake.

create table public.auth_rate_limit_attempts (
  id bigint generated always as identity primary key,
  action text not null check (action in ('signup', 'login', 'password_reset')),
  -- e.g. 'email:teacher@school.org' or 'ip:203.0.113.4' — checked/recorded
  -- per-identifier so a blocked email doesn't block the whole IP and vice
  -- versa. See lib/auth/rate-limit.ts for how these are built.
  identifier text not null,
  succeeded boolean not null default false,
  created_at timestamptz not null default now()
);

-- Rate-limit checks are "count failures for this action+identifier since
-- time X" — this index covers that query directly.
create index auth_rate_limit_attempts_lookup_idx
  on public.auth_rate_limit_attempts (action, identifier, created_at desc)
  where succeeded = false;

alter table public.auth_rate_limit_attempts enable row level security;
