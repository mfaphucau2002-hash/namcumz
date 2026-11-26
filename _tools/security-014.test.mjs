import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const readDb = file => readFile(new URL('../_db/' + file, import.meta.url), 'utf8');

async function bootstrapDb(db, { with009 = true } = {}) {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE SCHEMA storage;
    CREATE TABLE auth.users(
      id uuid PRIMARY KEY,
      email text,
      phone text,
      raw_user_meta_data jsonb DEFAULT '{}'
    );
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    CREATE TABLE storage.buckets(
      id text PRIMARY KEY,
      name text,
      public boolean,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    CREATE TABLE storage.objects(
      id uuid DEFAULT gen_random_uuid(),
      bucket_id text,
      name text
    );
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT SELECT, INSERT ON storage.objects TO authenticated;
  `);

  for (const file of [
    'production_001_release.sql',
    'production_005_order_identity.sql',
    'production_006_vietqr_payment.sql',
    'production_007_user_member_center.sql'
  ]) {
    await db.exec(await readDb(file));
  }

  await db.exec(`
    ALTER TABLE public.order_credentials RENAME COLUMN account_password TO account_password_ciphertext;
    CREATE FUNCTION namcumz_private.credential_key() RETURNS text LANGUAGE sql AS $fixture$
      SELECT repeat('x', 32)
    $fixture$;
    REVOKE ALL ON FUNCTION namcumz_private.credential_key() FROM PUBLIC, anon, authenticated;
    CREATE FUNCTION public.get_order_credentials(uuid) RETURNS text LANGUAGE sql AS $fixture$
      SELECT NULL::text
    $fixture$;
    REVOKE ALL ON FUNCTION public.get_order_credentials(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.get_order_credentials(uuid) TO authenticated;
    REVOKE ALL ON public.order_credentials FROM authenticated;
    INSERT INTO namcumz_private.migrations(version) VALUES ('production_002_credentials_encryption');
  `);

  if (with009) {
    await db.exec(await readDb('production_009_launch_access.sql'));
  }
  await db.exec(await readDb('production_012_security_hardening.sql'));
}

function makeAs(db) {
  return async (uid, fn) => {
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid || '']);
    await db.exec('SET ROLE ' + (uid ? 'authenticated' : 'anon'));
    try {
      return await fn();
    } finally {
      await db.exec('RESET ROLE');
    }
  };
}

const parseJsonRes = row => (typeof row.res === 'string' ? JSON.parse(row.res) : row.res);

test('014 preflight rejects DB without 009 marker', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, phone text, raw_user_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
      CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT SELECT, INSERT ON storage.objects TO authenticated;
    `);
    for (const file of [
      'production_001_release.sql',
      'production_005_order_identity.sql',
      'production_006_vietqr_payment.sql',
      'production_007_user_member_center.sql'
    ]) {
      await db.exec(await readDb(file));
    }
    await assert.rejects(
      db.exec(await readDb('production_014_checkin_hardening.sql')),
      /production_009_launch_access required/
    );
    await db.exec('ROLLBACK');
  } finally {
    await db.close();
  }
});

test('014 enforces 24h age gate, 15,000 VND unverified cap, rate limit, preserves 009 contract & passes verifier', async () => {
  const db = new PGlite();
  try {
    await bootstrapDb(db, { with009: true });
    const as = makeAs(db);

    const migration014 = await readDb('production_014_checkin_hardening.sql');
    await db.exec(migration014);
    await db.exec(migration014); // Idempotent re-run

    assert.equal(
      (await db.query('SELECT public.app_contract_version() AS v')).rows[0].v,
      'production_009_launch_access'
    );

    const verify014 = await readDb('production_014_verify.sql');
    await db.exec(verify014);
    await db.exec(await readDb('production_009_verify.sql'));

    // anon cannot execute claim_daily_checkin
    await assert.rejects(
      as(null, () => db.query('SELECT public.claim_daily_checkin()')),
      /permission denied/i
    );

    const freshUser = crypto.randomUUID();
    const matureUser = crypto.randomUUID();
    const cappedUser = crypto.randomUUID();

    for (const [id, username] of [
      [freshUser, 'fresh_probe'],
      [matureUser, 'mature_user'],
      [cappedUser, 'capped_user']
    ]) {
      await db.query(
        'INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES ($1, $2, $3::jsonb)',
        [id, `${username}@namcumz.com`, JSON.stringify({ username })]
      );
    }

    // 1. Account < 24h old is rejected with account_too_new and earns 0
    const resFresh = parseJsonRes((await as(freshUser, () => db.query('SELECT public.claim_daily_checkin() AS res'))).rows[0]);
    assert.equal(resFresh.success, false);
    assert.equal(resFresh.already_checked_in, false);
    assert.equal(resFresh.reason, 'account_too_new');
    const freshWalletCount = (await db.query('SELECT count(*)::int AS n FROM public.user_wallets WHERE user_id = $1', [freshUser])).rows[0].n;
    assert.equal(freshWalletCount, 0);

    // 2. Account >= 24h old succeeds (+500), writes wallet_transactions, duplicate same day returns already_checked_in=true
    await db.query("UPDATE public.user_roles SET created_at = now() - interval '25 hours' WHERE id = $1", [matureUser]);
    const resMature1 = parseJsonRes((await as(matureUser, () => db.query('SELECT public.claim_daily_checkin() AS res'))).rows[0]);
    assert.equal(resMature1.success, true);
    assert.equal(resMature1.reward, 500);
    assert.equal(resMature1.checkin_balance, 500);

    const txRows = (await db.query("SELECT amount, type FROM public.wallet_transactions WHERE user_id = $1 AND type = 'checkin'", [matureUser])).rows;
    assert.equal(txRows.length, 1);
    assert.equal(Number(txRows[0].amount), 500);

    const resMature2 = parseJsonRes((await as(matureUser, () => db.query('SELECT public.claim_daily_checkin() AS res'))).rows[0]);
    assert.equal(resMature2.success, false);
    assert.equal(resMature2.already_checked_in, true);

    // 3. Unverified cap: >= 15,000 VND with 0 PAID orders is blocked; after 1 PAID order, unblocked
    await db.query("UPDATE public.user_roles SET created_at = now() - interval '35 days' WHERE id = $1", [cappedUser]);
    await db.query('INSERT INTO public.user_wallets(user_id, balance, checkin_balance) VALUES ($1, 0, 15000)', [cappedUser]);

    const resCapped = parseJsonRes((await as(cappedUser, () => db.query('SELECT public.claim_daily_checkin() AS res'))).rows[0]);
    assert.equal(resCapped.success, false);
    assert.equal(resCapped.already_checked_in, false);
    assert.equal(resCapped.reason, 'unverified_cap_reached');

    // Simulate a PAID order for cappedUser
    const orderRow = (await as(cappedUser, () =>
      db.query("SELECT * FROM public.create_order($1, 'Cày La Hoàn 36 sao', 'Asia')", [crypto.randomUUID()])
    )).rows[0];
    await db.query("UPDATE public.orders SET price = 30000, paid_amount = 30000, payment_status = 'PAID', quote_accepted = true WHERE id = $1", [orderRow.id]);

    const resUnlocked = parseJsonRes((await as(cappedUser, () => db.query('SELECT public.claim_daily_checkin() AS res'))).rows[0]);
    assert.equal(resUnlocked.success, true);
    assert.equal(resUnlocked.checkin_balance, 15500);

    // 4. Verifier drift check
    const verifyBody = verify014.slice(verify014.indexOf('DO $verify$'), verify014.lastIndexOf('COMMIT;'));
    for (const drift of [
      'GRANT EXECUTE ON FUNCTION public.claim_daily_checkin() TO anon',
      "UPDATE namcumz_private.migrations SET version = 'missing' WHERE version = 'production_014_checkin_hardening'"
    ]) {
      await db.exec('BEGIN');
      await db.exec(drift);
      await assert.rejects(db.exec(verifyBody), `Verifier must fail on drift: ${drift}`);
      await db.exec('ROLLBACK');
    }
  } finally {
    await db.close();
  }
});

test('cleanup_pentest_round2_20261126.sql removes only the 3 zz2_* accounts and aborts if orders exist', async () => {
  const db = new PGlite();
  try {
    await bootstrapDb(db, { with009: true });
    const as = makeAs(db);

    const zz1 = '7a0d2964-de9a-48bb-bfd6-bf58c01a8c6b';
    const zz2 = crypto.randomUUID();
    const zz3 = crypto.randomUUID();
    const realUid = crypto.randomUUID();

    for (const [id, email, uname] of [
      [zz1, 'zz2_1_36181@namcumz.com', 'zz2_1_36181'],
      [zz2, 'zz2_2_32439@namcumz.com', 'zz2_2_32439'],
      [zz3, 'zz2_3_36406@namcumz.com', 'zz2_3_36406'],
      [realUid, 'khach_that@namcumz.com', 'khach_that']
    ]) {
      await db.query(
        'INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES ($1, $2, $3::jsonb)',
        [id, email, JSON.stringify({ username: uname })]
      );
    }

    // Simulate round 2 check-in rows (before 014) + notification
    for (const uid of [zz1, zz2, zz3]) {
      await as(uid, () => db.query('SELECT public.claim_daily_checkin()'));
      await db.query("INSERT INTO public.notifications(user_id, title, content) VALUES ($1, 'Test', 'Probe')", [uid]);
    }

    const cleanupSql = await readDb('cleanup_pentest_round2_20261126.sql');
    const cleanupBody = cleanupSql.slice(cleanupSql.indexOf('DO $cleanup$'), cleanupSql.indexOf('END $cleanup$;') + 'END $cleanup$;'.length);

    // Guard: if any target owns an order, abort
    await db.exec('BEGIN');
    await as(zz2, () => db.query("SELECT * FROM public.create_order($1, 'Guard order', 'Asia')", [crypto.randomUUID()]));
    await assert.rejects(db.exec(cleanupBody), /refusing cleanup/);
    await db.exec('ROLLBACK');

    // Run full cleanup
    await db.exec(cleanupSql);

    const remainingZz = (await db.query("SELECT count(*)::int AS n FROM auth.users WHERE email LIKE 'zz2\\_%@namcumz.com'")).rows[0].n;
    assert.equal(remainingZz, 0);

    const remainingCheckins = (await db.query('SELECT count(*)::int AS n FROM public.user_check_ins WHERE user_id = ANY($1)', [[zz1, zz2, zz3]])).rows[0].n;
    assert.equal(remainingCheckins, 0);

    // Real user preserved
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.user_roles WHERE id = $1', [realUid])).rows[0].n, 1);

    // Idempotent on second run
    await db.exec(cleanupSql);
  } finally {
    await db.close();
  }
});

test('redact_legacy_order_passwords_20261126.sql previews & redacts DH597 without touching Battle Pass orders', async () => {
  const db = new PGlite();
  try {
    await bootstrapDb(db, { with009: true });
    const as = makeAs(db);
    const uid = crypto.randomUUID();
    await db.query(
      'INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES ($1, $2, $3::jsonb)',
      [uid, 'legacy_cust@namcumz.com', JSON.stringify({ username: 'legacy_cust' })]
    );

    const dh597 = (await as(uid, () =>
      db.query("SELECT * FROM public.create_order($1, 'Cày La Hoàn', 'Asia')", [crypto.randomUUID()])
    )).rows[0];
    // Simulate legacy pre-012 order row containing plaintext password
    await db.query(
      "UPDATE public.orders SET order_code = 'DH597', status = 'hoan_thanh', content = $1 WHERE id = $2",
      ['[Asia] Nạp Genshin\nTK: demo@mail.com\npass: abc1234567\nSĐT: 0901234567', dh597.id]
    );

    const bpOrder = (await as(uid, () =>
      db.query("SELECT * FROM public.create_order($1, 'Cày Battle Pass lv 1-50', 'Asia')", [crypto.randomUUID()])
    )).rows[0];

    const sqlText = await readDb('redact_legacy_order_passwords_20261126.sql');
    const step1Sql = sqlText.slice(sqlText.indexOf('BEGIN TRANSACTION READ ONLY;'), sqlText.indexOf('COMMIT;') + 'COMMIT;'.length);

    // Execute Step 1 SELECT query directly to verify detection
    const selectSql = step1Sql.replace('BEGIN TRANSACTION READ ONLY;', '').replace('COMMIT;', '').trim();
    const previewRows = (await db.query(selectSql)).rows;
    assert.deepEqual(previewRows.map(r => r.order_code), ['DH597']);

    // Extract commented Step 2 block and run redaction
    const step2Start = sqlText.indexOf('/*') + 2;
    const step2End = sqlText.lastIndexOf('*/');
    const step2Sql = sqlText.slice(step2Start, step2End).trim();
    await db.exec(step2Sql);

    const updatedDh597 = (await db.query('SELECT content FROM public.orders WHERE id = $1', [dh597.id])).rows[0].content;
    assert.ok(!updatedDh597.includes('abc1234567'), 'Legacy plaintext password must be masked');
    assert.ok(updatedDh597.includes('[ĐÃ ẨN MẬT KHẨU ĐỂ BẢO MẬT]'));
    assert.ok(updatedDh597.includes('SĐT: 0901234567'), 'Non-password notes must be preserved');

    const unchangedBp = (await db.query('SELECT content FROM public.orders WHERE id = $1', [bpOrder.id])).rows[0].content;
    assert.equal(unchangedBp, 'Cày Battle Pass lv 1-50');
  } finally {
    await db.close();
  }
});
