-- Enable Row-Level Security on every table in the `public` schema.
--
-- Why: this project is hosted on Supabase, which auto-exposes `public` through
-- its Data API (PostgREST) at https://<ref>.supabase.co/rest/v1/*. That endpoint
-- is reachable by anyone holding the project's `anon` key (an anon key is public
-- by design). With RLS off, that means anyone could read/write/delete every row
-- — including `users.password_hash` and `password_reset_tokens.token_hash`.
--
-- The app never uses PostgREST; it talks to Postgres directly via Prisma as a
-- role with BYPASSRLS, so enabling RLS does NOT affect the application. With RLS
-- enabled and no policies, the Data API can see and change nothing.
--
-- Belt-and-suspenders: also turn the Data API off (or drop `public` from the
-- exposed schemas) in the Supabase dashboard — that removes the surface entirely
-- and covers future tables this migration doesn't.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
