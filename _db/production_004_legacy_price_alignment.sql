-- One atomic statement for Supabase SQL Editor. Preserve exact historical text in private backup.
DO $migration$
DECLARE
  bad_count bigint;
  price_type text;
BEGIN
  SELECT data_type INTO price_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'price';
  IF price_type <> 'text' THEN
    RAISE EXCEPTION 'Expected legacy orders.price text, found %', price_type;
  END IF;
  SELECT count(*) INTO bad_count FROM public.orders
  WHERE price IS NULL OR btrim(price) !~ '^[0-9]+([.,][0-9]{3})*$'
     OR length(replace(replace(btrim(price), '.', ''), ',', '')) > 18;
  IF bad_count <> 0 THEN RAISE EXCEPTION '% historical prices require manual review', bad_count; END IF;

  EXECUTE 'CREATE TABLE IF NOT EXISTS namcumz_private.orders_price_legacy_20261003 AS SELECT id, price AS original_price, status AS original_status FROM public.orders';
  EXECUTE $ddl$ALTER TABLE public.orders
    ALTER COLUMN price TYPE bigint USING replace(replace(btrim(price), '.', ''), ',', '')::bigint,
    ALTER COLUMN price SET DEFAULT 0,
    ALTER COLUMN price SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'cho_xu_ly'$ddl$;

  SELECT count(*) INTO bad_count FROM namcumz_private.orders_price_legacy_20261003 old
  JOIN public.orders current_order USING (id)
  WHERE current_order.price <> replace(replace(btrim(old.original_price), '.', ''), ',', '')::bigint
     OR current_order.status IS DISTINCT FROM old.original_status;
  IF bad_count <> 0 THEN RAISE EXCEPTION '% historical orders changed unexpectedly', bad_count; END IF;
  PERFORM pg_notify('pgrst', 'reload schema');
END $migration$;