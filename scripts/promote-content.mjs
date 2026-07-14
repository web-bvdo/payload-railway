// Promote content between two Postgres databases (e.g. staging -> production).
//
//   npm run promote -- --from "<SOURCE_URL>" --to "<TARGET_URL>" --yes
//   npm run promote -- --from "$STAGING_URL" --to "$PROD_URL" --reset --yes
//
// Copies CONTENT only. The auth/system tables are never touched, so the target
// keeps its own admin users, sessions and migration history:
//   users, users_sessions, payload_migrations, payload_preferences(+_rels),
//   payload_locked_documents(+_rels), payload_kv
//
// Schema must already exist in the target (it does: `payload migrate` runs on
// every Railway deploy). This only moves the data rows.
//
// Media: it copies the database rows that *reference* images, not the files.
// Point staging and production at the SAME Bucket (identical S3_* vars) so the
// files are already shared — then no file copy is needed. See docs/CONTENT.md.
//
// ponytail: type-perfect copy via `pg_dump | psql` (handles jsonb, arrays,
// timestamps correctly). pg_dump's major version must match the server's — the
// script finds a matching one or tells you `brew install postgresql@<major>`.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import pg from 'pg'

const SKIP = [
  'users',
  'users_sessions',
  'payload_migrations',
  'payload_preferences',
  'payload_preferences_rels',
  'payload_locked_documents',
  'payload_locked_documents_rels',
  'payload_kv',
]

function arg(name) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : undefined
}
const has = (name) => process.argv.includes(`--${name}`)

const from = arg('from') || process.env.PROMOTE_FROM
const to = arg('to') || process.env.PROMOTE_TO
const reset = has('reset')
const yes = has('yes')

if (!from || !to) {
  console.error('Usage: npm run promote -- --from "<SOURCE_URL>" --to "<TARGET_URL>" [--reset] --yes')
  process.exit(1)
}
if (from === to) {
  console.error('Refusing to run: --from and --to are the same database.')
  process.exit(1)
}

const hostOf = (url) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

// Find a pg_dump whose major version matches the source server.
async function findPgDump(sourceUrl) {
  const client = new pg.Client({ connectionString: sourceUrl })
  await client.connect()
  const { rows } = await client.query('SHOW server_version_num')
  await client.end()
  const major = Math.floor(Number(rows[0].server_version_num) / 10000)

  const candidates = [
    'pg_dump',
    `/opt/homebrew/opt/postgresql@${major}/bin/pg_dump`,
    `/usr/local/opt/postgresql@${major}/bin/pg_dump`,
    `/usr/lib/postgresql/${major}/bin/pg_dump`,
  ]
  for (const bin of candidates) {
    if (bin.includes('/') && !existsSync(bin)) continue
    const v = spawnSync(bin, ['--version'], { encoding: 'utf8' })
    if (v.status === 0) {
      const m = v.stdout.match(/(\d+)\.\d+/)
      if (m && Number(m[1]) === major) return bin
    }
  }
  console.error(
    `\nNo pg_dump for Postgres ${major} found. The server is v${major} and pg_dump must match.\n` +
      `Fix (macOS):  brew install postgresql@${major}\n`,
  )
  process.exit(1)
}

const pgDump = await findPgDump(from)

console.log(`\nPromote CONTENT:`)
console.log(`  from : ${hostOf(from)}`)
console.log(`  to   : ${hostOf(to)}`)
console.log(`  reset target content first: ${reset ? 'yes' : 'no (assumes empty/clean target)'}`)
console.log(`  skipping (kept on target): ${SKIP.join(', ')}\n`)

if (!yes) {
  console.error('Add --yes to actually run (this writes to the target database).')
  process.exit(1)
}

// Optionally clear the target's content tables so a re-promote replaces cleanly.
if (reset) {
  const t = new pg.Client({ connectionString: to })
  await t.connect()
  const { rows } = await t.query(
    `select tablename from pg_tables where schemaname='public'`,
  )
  const tables = rows
    .map((r) => r.tablename)
    .filter((name) => !SKIP.includes(name))
  if (tables.length) {
    await t.query('SET session_replication_role = replica') // skip FK checks
    await t.query(
      `TRUNCATE ${tables.map((x) => `"${x}"`).join(', ')} RESTART IDENTITY`,
    )
    console.log(`Truncated ${tables.length} content tables on target.`)
  }
  await t.end()
}

// Type-perfect data copy. session_replication_role=replica lets rows load in
// pg_dump's order without FK errors.
const excludes = SKIP.flatMap((t) => ['--exclude-table-data', `public.${t}`])
const dump = spawnSync(
  'sh',
  [
    '-c',
    `( echo "SET session_replication_role = replica;"; "${pgDump}" --data-only --no-owner --no-privileges ${excludes
      .map((e) => (e.startsWith('--') ? e : `'${e}'`))
      .join(' ')} "${from}" ) | psql --set ON_ERROR_STOP=on "${to}"`,
  ],
  { stdio: 'inherit' },
)

if (dump.status !== 0) {
  console.error('\nPromote failed.')
  process.exit(dump.status || 1)
}
console.log('\nDone. Content promoted. (Admin users on the target were left untouched.)')
