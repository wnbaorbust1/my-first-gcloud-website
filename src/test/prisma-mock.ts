// Stand-in for "@/lib/prisma" under Vitest — see vitest.config.ts. The
// pure-function suites this test config targets never call a Prisma
// method; this only exists so importing a file that happens to import
// `prisma` at module scope (e.g. src/lib/billing/membership.ts) doesn't
// require a real Postgres connection to run `npm test`.
export const prisma = {} as never;
