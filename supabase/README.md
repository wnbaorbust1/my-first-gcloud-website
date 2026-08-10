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

No schema exists yet — this foundation phase only sets up the folder and
the typed client wiring in `lib/supabase/`. Auth, tables, and RLS policies
land in a later phase.
