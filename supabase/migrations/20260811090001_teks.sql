-- Reference data: TEKS (Texas Essential Knowledge and Skills) standards.
-- Seeded with a small illustrative sample per subject for development —
-- these are NOT verified official TEKS text, just plausible-looking
-- placeholders so the curriculum browser has something real to render. A
-- full, accurate import replaces this seed data in a later phase; the
-- schema itself won't need to change for that.

create table public.teks (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- e.g. '111.39(c)(6)(A)'
  -- Free text, not constrained to a fixed list — the real TEA subject-area
  -- taxonomy isn't modeled yet, and guessing at it now would just make the
  -- later real import fight the schema.
  subject text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index teks_subject_idx on public.teks (subject);

create trigger teks_set_updated_at
  before update on public.teks
  for each row
  execute function public.set_updated_at();

alter table public.teks enable row level security;

-- Reference data, same treatment as courses: readable by anyone, admin-only writes.
create policy teks_select_all on public.teks
  for select
  to anon, authenticated
  using (true);

create policy teks_insert_admin on public.teks
  for insert
  to authenticated
  with check (public.is_admin());

create policy teks_update_admin on public.teks
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy teks_delete_admin on public.teks
  for delete
  to authenticated
  using (public.is_admin());

insert into public.teks (code, subject, description) values
  ('111.39(c)(6)(A)', 'Algebra I', 'Illustrative sample — write linear functions in various forms given a table, graph, or verbal description.'),
  ('111.39(c)(10)(A)', 'Algebra I', 'Illustrative sample — write quadratic functions when given real solutions and graphs of their related equations.'),
  ('112.34(c)(9)(A)', 'Biology', 'Illustrative sample — investigate and explain cellular processes, including homeostasis and cell division.'),
  ('112.34(c)(4)(B)', 'Biology', 'Illustrative sample — differentiate between prokaryotic and eukaryotic cells.'),
  ('110.36(b)(5)(A)', 'English I', 'Illustrative sample — analyze how the author''s use of language achieves specific purposes and creates rhetorical effect.'),
  ('110.36(b)(9)(D)(ix)', 'English I', 'Illustrative sample — analyze how literary essays interweave personal examples and ideas with factual information.'),
  ('113.44(c)(8)(A)', 'US History', 'Illustrative sample — identify causes of the Great Depression and its effects on the U.S. economy and society.'),
  ('113.44(c)(11)(A)', 'US History', 'Illustrative sample — evaluate the impact of significant national civil rights legislation.'),
  ('130.166(c)(3)(A)', 'Money Matters', 'Illustrative sample — analyze the effect of the economy on personal financial decisions.'),
  ('130.166(c)(5)(B)', 'Money Matters', 'Illustrative sample — evaluate the costs and benefits of saving and investing.'),
  ('130.166(c)(7)(A)', 'Dollars & Sense', 'Illustrative sample — develop a personal budget based on financial goals.'),
  ('130.166(c)(9)(C)', 'Dollars & Sense', 'Illustrative sample — compare the advantages and disadvantages of different types of credit.'),
  ('130.167(c)(2)(A)', 'Accounting I', 'Illustrative sample — apply the accounting equation to analyze business transactions.'),
  ('130.167(c)(6)(B)', 'Accounting I', 'Illustrative sample — prepare a bank reconciliation.'),
  ('130.168(c)(3)(A)', 'Accounting II', 'Illustrative sample — analyze financial statements for a merchandising business.'),
  ('130.168(c)(8)(A)', 'Accounting II', 'Illustrative sample — apply managerial accounting concepts to business decision-making.')
on conflict (code) do nothing;
