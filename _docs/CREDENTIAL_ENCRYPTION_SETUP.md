# Credential Encryption Setup

`production_002_credentials_encryption.sql` requires one Supabase Vault secret before it is run. The secret name is `namcumz-order-credentials-key`; its value must be at least 32 characters. Do not paste the value into Git, chat, browser code, SQL migration files, or logs.

Run this in the target Supabase SQL editor as a privileged operator. It generates the key inside Vault only when the secret does not already exist:

```sql
select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'namcumz-order-credentials-key',
  'Encryption key for NAMCUMZ order credentials'
)
where not exists (
  select 1 from vault.secrets where name = 'namcumz-order-credentials-key'
);
```

Then run, in order:

1. `_db/production_000_p0_containment.sql`
2. `_db/production_001_release.sql`
3. `_db/production_002_credentials_encryption.sql`
4. `_db/production_002_verify.sql`

The encryption migration backfills existing `account_password` values into `account_password_ciphertext`, verifies that every row has ciphertext, and drops the plaintext column. It fails before that drop if Vault is unavailable or the key is missing. The frontend contract is `production_002_credentials_encryption`, so the website remains in maintenance mode until the migration and verification succeed.

The only client credential read path after migration is `public.get_order_credentials(uuid)`. Direct table reads remain revoked for `anon` and `authenticated`.
## Staging rehearsal

Staging has its own Supabase Vault. Create a key there using the same secret name and setup SQL above (the value is generated and stored inside that staging project). After confirming the staging ledger contains `staging_003_login_topup`, run `_db/staging_004_credentials_encryption.sql`, then `_db/staging_004_verify.sql`. The staging frontend contract is `staging_004_credentials_encryption`; do not set the production contract value in staging config. Use synthetic accounts and credentials for the rehearsal.
