# Supabase

`migrations/` holds SQL migrations (schema, RLS policies, functions),
managed with the Supabase CLI:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase migration new <name>       # create a new migration file
supabase db push                    # apply migrations to the linked project
supabase gen types typescript --project-id <project-ref> > types/supabase.ts
```

`seed.sql` holds local-dev-only demo content (sample curriculum data) —
applied after migrations by:

```bash
supabase db reset          # local dev database: migrations + seed.sql
```

`db push` does **not** run `seed.sql` against a linked (hosted) project by
default — that's intentional. Real reference data (like the `teks` sample
rows and the 8 seeded `courses`) lives in the migrations themselves; only
throwaway demo content (sample units/weeks/lessons) belongs in `seed.sql`.

Every migration in this repo has been run against a real local Postgres
instance and functionally tested (schema, triggers, RLS as different
simulated users) before being committed — not just checked for valid SQL
syntax.
