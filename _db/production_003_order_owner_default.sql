-- Restore the owner default on legacy production orders.
-- Existing rows are unchanged; RPC-created orders will inherit the authenticated user.
BEGIN;
ALTER TABLE public.orders ALTER COLUMN user_id SET DEFAULT auth.uid();
DO $verify$
DECLARE actual text;
BEGIN
  SELECT column_default INTO actual
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'user_id';
  IF actual IS DISTINCT FROM 'auth.uid()' THEN
    RAISE EXCEPTION 'orders.user_id default is %, expected auth.uid()', actual;
  END IF;
END $verify$;
COMMIT;
