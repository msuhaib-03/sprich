-- Enable Row-Level Security on every table in the `public` schema.
--
-- Context: this project is hosted on Supabase, which auto-exposes `public`
-- through its Data API (PostgREST) at https://<ref>.supabase.co/rest/v1/*. That
-- endpoint is usable by anyone holding the project's `anon` key (public by
-- design), and `anon` / `authenticated` already have full DML grants on every
-- `public` table. With RLS disabled that means unauthenticated read/write/delete
-- of all rows — including `users.password_hash` and
-- `password_reset_tokens.token_hash`.
--
-- The application never uses PostgREST or the Supabase client (verified). It
-- connects to Postgres directly via Prisma as role `postgres`, which:
--   * OWNS every table in `public` (so it is exempt from a table's own RLS
--     unless FORCE is set — which this migration deliberately does NOT do), and
--   * has rolbypassrls = true (so it skips RLS regardless).
-- Enabling RLS with NO policies is therefore a deny-all for the Data API and a
-- no-op for the app: every existing Prisma query returns the same rows.
--
-- Belt-and-suspenders (do this too, in the Supabase dashboard, not here):
-- Project Settings -> API -> remove `public` from "Exposed schemas" (or disable
-- the Data API). That removes the surface entirely and covers future tables.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    -- ENABLE (not FORCE): the owner/BYPASSRLS role — i.e. Prisma — stays exempt.
    -- Re-running on an already-enabled table is a no-op, so this is idempotent.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
