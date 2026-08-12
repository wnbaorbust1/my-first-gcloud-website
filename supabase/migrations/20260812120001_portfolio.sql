-- Student portfolios. Teacher-managed on behalf of students (there's no
-- student-account system) — ownership walks portfolio_items -> students ->
-- classes -> profile_id, the exact same two-join EXISTS shape as
-- assignment_grades and teks_mastery in the TEKS-mastery migration.

create type public.portfolio_artifact_type as enum ('file', 'link', 'text');

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  -- Optional: this item came from grading a specific assignment. Set null
  -- (not cascaded away) if the assignment is later deleted — the
  -- portfolio item is the student's record, independent of the
  -- admin-authored assignment it originated from.
  assignment_id uuid references public.assignments (id) on delete set null,
  title text not null,
  description text,
  artifact_type public.portfolio_artifact_type not null,
  -- Exactly one of these three is set, matching artifact_type — enforced
  -- below rather than three separate nullable tables.
  file_path text, -- path within the 'portfolio-items' Storage bucket
  link_url text,
  text_content text,
  submitted_date date not null default current_date,
  teacher_notes text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_items_artifact_shape check (
    (artifact_type = 'file' and file_path is not null and link_url is null and text_content is null)
    or (artifact_type = 'link' and link_url is not null and file_path is null and text_content is null)
    or (artifact_type = 'text' and text_content is not null and file_path is null and link_url is null)
  )
);

create index portfolio_items_student_id_idx on public.portfolio_items (student_id);
create index portfolio_items_assignment_id_idx on public.portfolio_items (assignment_id);

create trigger portfolio_items_set_updated_at
  before update on public.portfolio_items
  for each row
  execute function public.set_updated_at();

alter table public.portfolio_items enable row level security;

create policy portfolio_items_all on public.portfolio_items
  for all
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = portfolio_items.student_id
        and c.profile_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = portfolio_items.student_id
        and c.profile_id = auth.uid()
    )
  );

-- ── Storage ──────────────────────────────────────────────────────────────
-- Private bucket; every read goes through a signed URL (see
-- lib/portfolio/storage.ts), never a public URL. Object paths are
-- `{class_id}/{student_id}/{filename}` so ownership can be checked from
-- the path alone via storage.foldername(), without a second table join.

insert into storage.buckets (id, name, public)
values ('portfolio-items', 'portfolio-items', false)
on conflict (id) do nothing;

create policy portfolio_items_objects_all on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'portfolio-items'
    and (
      public.is_admin()
      or exists (
        select 1 from public.classes c
        where c.id::text = (storage.foldername(name))[1]
          and c.profile_id = auth.uid()
      )
    )
  )
  with check (
    bucket_id = 'portfolio-items'
    and (
      public.is_admin()
      or exists (
        select 1 from public.classes c
        where c.id::text = (storage.foldername(name))[1]
          and c.profile_id = auth.uid()
      )
    )
  );
