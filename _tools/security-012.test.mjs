import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const readDb = file => readFile(new URL('../_db/' + file, import.meta.url), 'utf8');

async function bootstrapBaseDb(db, {with009 = true, withLegacyQuoteRequests = true} = {}) {
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

  // Metadata fixture required by 009 preflight (matches launch-security.test.mjs)
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

  if (withLegacyQuoteRequests) {
    // Simulated legacy public.quote_requests with permissive anon read/insert (R4)
    await db.exec(`
      CREATE TABLE public.quote_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        game text NOT NULL DEFAULT 'Genshin Impact',
        contact text NOT NULL DEFAULT '',
        note text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_requests TO anon, authenticated;
      CREATE POLICY legacy_anon_all ON public.quote_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    `);
  }
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

test('012 preflight rejects DB without 009 marker', async () => {
  const db = new PGlite();
  try {
    await bootstrapBaseDb(db, {with009: false, withLegacyQuoteRequests: true});
    await assert.rejects(
      db.exec(await readDb('production_012_security_hardening.sql')),
      /production_009_launch_access required/
    );
    await db.exec('ROLLBACK');
  } finally {
    await db.close();
  }
});

test('012 locks down quote_requests (R4), guards create_order against plaintext passwords (R5), passes verifier & catches drift', async () => {
  const db = new PGlite();
  try {
    await bootstrapBaseDb(db, {with009: true, withLegacyQuoteRequests: true});
    const as = makeAs(db);

    const alice = crypto.randomUUID();
    const bob = crypto.randomUUID();
    const admin = crypto.randomUUID();
    const inactiveAdmin = crypto.randomUUID();

    for (const [id, username] of [
      [alice, 'alice'],
      [bob, 'bob'],
      [admin, 'admin_user'],
      [inactiveAdmin, 'inactive_admin']
    ]) {
      await db.query(
        'INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES ($1, $2, $3::jsonb)',
        [id, `${username}@namcumz.com`, JSON.stringify({username})]
      );
    }
    await db.query("UPDATE public.user_roles SET role = 'admin' WHERE id = $1", [admin]);
    await db.query("UPDATE public.user_roles SET role = 'admin', active = false WHERE id = $1", [inactiveAdmin]);

    const realQuoteId = crypto.randomUUID();
    const syntheticQuoteId = '0af1fdd0-462f-48dd-959c-246488d0f7f8';
    await db.query(
      "INSERT INTO public.quote_requests(id, game, contact, note) VALUES ($1, 'Genshin Impact', '0900000001', 'Bao gia cay map')",
      [realQuoteId]
    );

    // Reproduce R4 vulnerability BEFORE applying 012: anon can SELECT and INSERT
    const preAnonRead = await as(null, () => db.query('SELECT id FROM public.quote_requests'));
    assert.equal(preAnonRead.rows.length, 1);
    await as(null, () => db.query(
      "INSERT INTO public.quote_requests(id, game, contact, note) VALUES ($1, 'Probe', 'probe', 'r4_probe')",
      [syntheticQuoteId]
    ));

    // Apply 012 migration (and re-run to confirm idempotency)
    const migrationSql = await readDb('production_012_security_hardening.sql');
    await db.exec(migrationSql);
    await db.exec(migrationSql);

    // app_contract_version() MUST remain unchanged for zero-downtime live frontend
    const contract = (await db.query('SELECT public.app_contract_version() AS v')).rows[0].v;
    assert.equal(contract, 'production_009_launch_access');

    // Run both 012 and 009 verifiers (012 must not break 009 invariants)
    const verify012 = await readDb('production_012_verify.sql');
    await db.exec(verify012);
    await db.exec(await readDb('production_009_verify.sql'));

    // --- R4 runtime enforcement ---
    await assert.rejects(
      as(null, () => db.query('SELECT * FROM public.quote_requests')),
      /permission denied/i
    );
    await assert.rejects(
      as(null, () => db.query("INSERT INTO public.quote_requests(game, contact, note) VALUES ('G', 'c', 'n')")),
      /permission denied/i
    );

    // Authenticated customer sees 0 rows and cannot write
    const custRows = (await as(alice, () => db.query('SELECT * FROM public.quote_requests'))).rows;
    assert.equal(custRows.length, 0);
    await assert.rejects(
      as(alice, () => db.query("INSERT INTO public.quote_requests(game, contact, note) VALUES ('G', 'c', 'n')")),
      /permission denied/i
    );
    await assert.rejects(
      as(alice, () => db.query('DELETE FROM public.quote_requests WHERE id = $1', [realQuoteId])),
      /permission denied/i
    );

    // Inactive admin sees 0 rows
    const inactiveAdminRows = (await as(inactiveAdmin, () => db.query('SELECT * FROM public.quote_requests'))).rows;
    assert.equal(inactiveAdminRows.length, 0);

    // Active admin can read all rows, but cannot mutate via client grants
    const adminRows = (await as(admin, () => db.query('SELECT id FROM public.quote_requests ORDER BY id'))).rows;
    assert.equal(adminRows.length, 2);
    await assert.rejects(
      as(admin, () => db.query("INSERT INTO public.quote_requests(game, contact, note) VALUES ('G', 'c', 'n')")),
      /permission denied/i
    );

    // --- R5 runtime enforcement on public.create_order ---
    // anon cannot execute create_order
    await assert.rejects(
      as(null, () => db.query("SELECT * FROM public.create_order($1, 'Cay La Hoan', 'Asia')", [crypto.randomUUID()])),
      /permission denied/i
    );

    // Reject plaintext password indicators
    const blockedPayloads = [
      'Ghi chu: pass: abc123',
      'mk: 123456',
      'MK : 123456',
      'Mật khẩu: test',
      'MẬT KHẨU = Secret123',
      'mat khau: abc999',
      'UID 800001234\r\npassword=mysecret',
      'TK: demo, pw: 999999',
      'TK:demo/mk:123456',
      'Cày Battle Pass, pass: abc123'
    ];
    for (const payload of blockedPayloads) {
      await assert.rejects(
        as(alice, () => db.query('SELECT * FROM public.create_order($1, $2, $3)', [crypto.randomUUID(), payload, 'Asia'])),
        /Không nhập mật khẩu tài khoản game vào nội dung ghi chú đơn hàng\./,
        `Expected password payload to be rejected: ${payload}`
      );
    }

    // Allow legitimate boosting requests (no false positives on Battle Pass / Express Supply Pass)
    const allowedPayloads = [
      'Cày La Hoàn 36 sao server Asia, UID 800001234',
      'Cày Battle Pass từ lv 1 lên lv 50 cho tài khoản Genshin',
      'Mua gói Express Supply Pass và farm di vật HSR',
      'Battle Pass: cày nhiệm vụ tuần lên cấp 50',
      'Express Supply Pass: gia hạn 1 tháng giúp mình',
      'Mình sẽ gửi mật khẩu trong chat sau khi chốt báo giá',
      'Xin bypass: bỏ qua boss tuần, chỉ farm thánh di vật'
    ];
    for (const payload of allowedPayloads) {
      const reqId = crypto.randomUUID();
      const res = await as(alice, () =>
        db.query('SELECT * FROM public.create_order($1, $2, $3)', [reqId, payload, 'Asia'])
      );
      assert.equal(res.rows[0].content, payload, `Expected valid payload to succeed: ${payload}`);
    }

    // Verify idempotency still works on create_order
    const idemReq = crypto.randomUUID();
    const first = (await as(bob, () =>
      db.query("SELECT * FROM public.create_order($1, 'Cày Battle Pass Genshin', 'Asia')", [idemReq])
    )).rows[0];
    const replay = (await as(bob, () =>
      db.query("SELECT * FROM public.create_order($1, 'Cày Battle Pass Genshin', 'Asia')", [idemReq])
    )).rows[0];
    assert.equal(first.id, replay.id);
    await assert.rejects(
      as(bob, () =>
        db.query("SELECT * FROM public.create_order($1, 'Nội dung khác', 'Asia')", [idemReq])
      ),
      /Mã yêu cầu đã dùng cho nội dung khác/
    );

    // --- Verifier drift detection ---
    const verifyBody = verify012.slice(verify012.indexOf('DO $verify$'), verify012.lastIndexOf('COMMIT;'));
    const driftMutations = [
      'GRANT SELECT ON public.quote_requests TO anon',
      'GRANT INSERT ON public.quote_requests TO anon',
      'GRANT INSERT ON public.quote_requests TO authenticated',
      'GRANT UPDATE ON public.quote_requests TO authenticated',
      'GRANT DELETE ON public.quote_requests TO authenticated',
      'ALTER TABLE public.quote_requests DISABLE ROW LEVEL SECURITY',
      'CREATE POLICY extra_leak ON public.quote_requests FOR SELECT TO authenticated USING (true)',
      'GRANT EXECUTE ON FUNCTION public.create_order(uuid, text, text, uuid, text) TO anon',
      "UPDATE namcumz_private.migrations SET version = 'missing' WHERE version = 'production_012_security_hardening'"
    ];
    for (const mutation of driftMutations) {
      await db.exec('BEGIN');
      await db.exec(mutation);
      await assert.rejects(db.exec(verifyBody), `Verifier must fail on drift: ${mutation}`);
      await db.exec('ROLLBACK');
    }
  } finally {
    await db.close();
  }
});

test('012 migration and verifier succeed cleanly when public.quote_requests does not exist', async () => {
  const db = new PGlite();
  try {
    await bootstrapBaseDb(db, {with009: true, withLegacyQuoteRequests: false});
    await db.exec(await readDb('production_012_security_hardening.sql'));
    await db.exec(await readDb('production_012_verify.sql'));
  } finally {
    await db.close();
  }
});

test('cleanup_pentest_20261126.sql safely removes only pentest artifacts and aborts if orders exist', async () => {
  const db = new PGlite();
  try {
    await bootstrapBaseDb(db, {with009: true, withLegacyQuoteRequests: true});
    await db.exec(await readDb('production_012_security_hardening.sql'));
    const as = makeAs(db);

    const pentestUid = 'cfeb051f-12fb-4d56-9093-28e982a44fff';
    const syntheticQuoteId = '0af1fdd0-462f-48dd-959c-246488d0f7f8';
    const realUid = crypto.randomUUID();
    const realQuoteId = crypto.randomUUID();

    await db.query(
      'INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES ($1, $2, $3::jsonb)',
      [pentestUid, 'zz_probe_rls@namcumz.com', JSON.stringify({username: 'zz_probe_rls'})]
    );
    await db.query(
      'INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES ($1, $2, $3::jsonb)',
      [realUid, 'real_customer@namcumz.com', JSON.stringify({username: 'real_customer'})]
    );

    // Populate child tables for pentest user (wallet, check-in, wallet_transactions, notifications)
    await as(pentestUid, () => db.query('SELECT public.claim_daily_checkin()'));
    await db.query(
      "INSERT INTO public.notifications(user_id, title, content) VALUES ($1, 'Test', 'Pentest notif')",
      [pentestUid]
    );
    await db.query(
      "INSERT INTO public.quote_requests(id, game, contact, note) VALUES ($1, 'Probe', '000', 'synthetic'), ($2, 'Genshin', '090', 'real')",
      [syntheticQuoteId, realQuoteId]
    );

    const cleanupSql = await readDb('cleanup_pentest_20261126.sql');
    const endMarker = 'END $cleanup$;';
    const cleanupBody = cleanupSql.slice(
      cleanupSql.indexOf('DO $cleanup$'),
      cleanupSql.indexOf(endMarker) + endMarker.length
    );

    // Guard check: if target UID has an order, cleanup MUST abort
    await db.exec('BEGIN');
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [pentestUid]);
    await db.query(
      "SELECT * FROM public.create_order($1, 'Synthetic guard order', 'Asia')",
      [crypto.randomUUID()]
    );
    await assert.rejects(db.exec(cleanupBody), /refusing cleanup/);
    await db.exec('ROLLBACK');

    // Run full cleanup script when 0 orders exist for pentest user
    await db.exec(cleanupSql);

    // Pentest user and all child artifacts must be removed
    for (const [table, col] of [
      ['public.wallet_transactions', 'user_id'],
      ['public.user_check_ins', 'user_id'],
      ['public.user_wallets', 'user_id'],
      ['public.notifications', 'user_id'],
      ['public.user_roles', 'id'],
      ['auth.users', 'id']
    ]) {
      const cnt = (await db.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${col} = $1`, [pentestUid])).rows[0].n;
      assert.equal(cnt, 0, `Expected 0 pentest rows left in ${table}`);
    }

    // Synthetic quote_requests row removed, real quote_requests row preserved
    const quotes = (await db.query('SELECT id FROM public.quote_requests')).rows;
    assert.deepEqual(quotes.map(r => r.id), [realQuoteId]);

    // Real user completely untouched
    const realCount = (await db.query('SELECT count(*)::int AS n FROM public.user_roles WHERE id = $1', [realUid])).rows[0].n;
    assert.equal(realCount, 1);

    // Re-running cleanup is safe / idempotent
    await db.exec(cleanupSql);
  } finally {
    await db.close();
  }
});
