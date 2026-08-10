# Legacy Command Center for Teachers

A subscription curriculum platform for high school teachers — AI-generated,
TEKS-aligned lesson plans, assignments, assessments, a gradebook, TEKS
mastery tracking, student portfolios, a prep checklist, a bell ringer
generator, a financial life simulation, a presentation builder, calendar
sync, and Stripe-gated access across 8 subjects (Money Matters, Dollars &
Sense, Algebra I, Biology, English I, US History, Accounting I, Accounting
II).

This is a from-scratch rebuild, being built in phases. **This phase is the
foundation only** — project scaffold, design system, folder structure, and
Supabase client wiring. No auth, database schema, or features yet.

## Tech stack

- **Next.js 14** (App Router) + TypeScript
- **Supabase** — Postgres + Auth + Storage + Row-Level Security
- **Tailwind CSS**
- **Stripe** for subscription billing
- Deployed on **Vercel**

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real Supabase/Stripe keys
npm run dev
```

Open http://localhost:3000.

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## Design system

Brand tokens live as CSS variables in `app/globals.css` and are mapped into
`tailwind.config.ts`.

| Token | Value | Tailwind class |
|---|---|---|
| `--ink` | `#2B2420` | `text-ink`, `bg-ink`, `border-ink` |
| `--cream` | `#FAF7F0` | `text-cream`, `bg-cream`, `border-cream` |
| `--rose-gold` | `#B76E79` | `text-rose-gold`, `bg-rose-gold`, `border-rose-gold` |
| `--gold-leaf` | `#C9A24B` | `text-gold-leaf`, `bg-gold-leaf`, `border-gold-leaf` |
| `--slate` | `#6B6459` | `text-slate`, `bg-slate`, `border-slate` |

All five support Tailwind opacity modifiers (`border-rose-gold/40`) — they're
stored as `"R G B"` channel triples and wrapped with `rgb(var(...) /
<alpha-value>)` in the Tailwind config, not as hex strings.

Each of the 8 courses gets **one unique accent hue**, used only for that
course's small tag/icon — never a full background. See
`components/ui/course-tag.tsx` and the `--accent-*` variables in
`globals.css` (placeholders until real curriculum data exists).

**Fonts** (via `next/font/google`, wired in `app/layout.tsx`):
- `font-display` → Cormorant Garamond — headings and key numbers only, never body text
- `font-sans` → DM Sans — body text (Tailwind's default `font-sans`)
- `font-mono` → DM Mono — tabular/data text (grades, TEKS codes, dates)

**Signature element — the Ledger Line**: a thin rose-gold rule under every
table row / list item, echoing a physical grade book, applied via the
`.ledger-row` class (`app/globals.css`) or the `<LedgerRow>` component
(`components/ui/ledger-row.tsx`). Status changes get a small gold-leaf
stamp/check mark (`components/ui/status-stamp.tsx`) in the margin instead of
a colored pill badge. Use these two everywhere there's a list — see
`app/page.tsx` for a live example.

**Layout**: a left-rail navigator (`components/layout/nav-rail.tsx`) styled
like a bound planner's index/spine, not a generic hamburger sidebar. It
collapses to a top bar + slide-over on mobile (`components/layout/shell.tsx`).

**Motion**: subtle only — `animate-page-turn` / `animate-stamp-land` utility
classes (defined in `tailwind.config.ts`), both flattened to instant under
`prefers-reduced-motion: reduce` (see `globals.css`).

**Focus states**: a visible rose-gold `:focus-visible` outline is applied
globally in `globals.css`.

## Folder structure

```
app/                       Routes (App Router). Pages compose components;
                            keep data/business logic in lib/.
  layout.tsx                Root layout — fonts, metadata, <Shell>
  page.tsx                  Home / design system preview
  globals.css                Brand tokens, ledger-line, focus states

components/
  layout/                    Shell, NavRail — app chrome
  ui/                        Shared primitives (LedgerRow, StatusStamp, CourseTag)
  auth/                      Feature components — empty until built
  curriculum/
  assignments/
  assessments/
  portfolio/
  admin/
  billing/

lib/
  supabase/                  Typed Supabase clients
    client.ts                 Browser client (Client Components)
    server.ts                 Server client (Server Components/Actions/Routes)
  utils.ts                   cn() class-merge helper
  auth/                       Feature logic — empty until built
  curriculum/
  assignments/
  assessments/
  portfolio/
  admin/
  billing/

types/
  supabase.ts                 Database type (placeholder — regenerate via Supabase CLI once schema exists)
  index.ts                    Barrel export

supabase/
  migrations/                 SQL migrations (empty until schema exists)
  README.md                   Supabase CLI workflow notes
```

Each feature domain (auth, curriculum, assignments, assessments, portfolio,
admin, billing) gets matching folders under `app/`, `components/`, and
`lib/` as it's built, so related code stays colocated by feature rather than
by type.

## Environment variables

See `.env.example`. Copy to `.env.local` (already git-ignored) and fill in:
- Supabase project URL + anon key (public), service role key (server-only)
- Stripe publishable key (public), secret key + webhook secret (server-only)

## Status

✅ Project scaffold, design system, folder structure, Supabase client wiring
⬜ Auth
⬜ Database schema + RLS
⬜ Curriculum / assignments / assessments / gradebook / portfolio features
⬜ Stripe billing
⬜ Deployment config
