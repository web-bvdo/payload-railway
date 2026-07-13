// One-time seed of LOCAL dev content into a PRODUCTION deploy:
//   1. copies content rows from ./payload.db into the remote libSQL/Turso DB
//   2. uploads ./media files to the Vercel Blob store
//
// Run once, before entering content in the production /admin. See
// docs/DEPLOY-VERCEL.md ("Bestaande dev-content naar productie").
//
//   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... \
//   BLOB_READ_WRITE_TOKEN=... npm run migrate:content
//
// ponytail: one-way seed, not a differential sync. It OR-REPLACEs content rows
// and overwrites same-named blobs. Re-runnable, but it won't delete prod rows
// that no longer exist locally. If you need real two-way sync, that's a
// different tool — don't grow this one into it.
import { createClient } from '@libsql/client'
import { put } from '@vercel/blob'
import { readFileSync, readdirSync, existsSync } from 'node:fs'

const url = process.env.DATABASE_URI || process.env.TURSO_DATABASE_URL
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN
const blobToken = process.env.BLOB_READ_WRITE_TOKEN

// Auth/system tables stay per-environment: prod has its own admin user, its own
// migration state and its own admin-UI prefs. Copying them would clobber those.
const SKIP = new Set([
  'users', 'users_sessions', 'payload_migrations', 'payload_kv',
  'payload_preferences', 'payload_preferences_rels',
  'payload_locked_documents', 'payload_locked_documents_rels',
])

async function copyContent() {
  if (!url || !authToken) {
    console.log('DB: TURSO_DATABASE_URL/AUTH_TOKEN niet gezet — content-kopie overgeslagen.')
    return
  }
  const local = createClient({ url: 'file:payload.db' })
  const remote = createClient({ url, authToken })

  const { rows: tableRows } = await local.execute(
    "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name",
  )
  const tables = tableRows.map((r) => r.name).filter((n) => !SKIP.has(n))

  // Read every content row and bind values as parameters. Bound params sidestep
  // the SQL-text encoding the sqlite `.dump` uses (unistr()), which libSQL/Turso
  // does not implement.
  const stmts = []
  for (const t of tables) {
    const res = await local.execute(`SELECT * FROM "${t}"`)
    if (res.rows.length === 0) continue
    const cols = res.columns
    const sql = `INSERT OR REPLACE INTO "${t}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`
    for (const row of res.rows) stmts.push({ sql, args: cols.map((c) => row[c]) })
  }

  console.log(`DB: ${stmts.length} rijen uit ${tables.length} tabellen -> ${url}`)
  // One transaction with deferred FK checks: parent/child insert order then
  // doesn't matter (Turso enforces FKs, and they're only validated at COMMIT,
  // when every referenced row is present).
  const tx = await remote.transaction('write')
  try {
    await tx.execute('PRAGMA defer_foreign_keys=ON')
    for (let i = 0; i < stmts.length; i++) {
      await tx.execute(stmts[i])
      if (i % 100 === 0) process.stdout.write(`\r  ${i}/${stmts.length}`)
    }
    await tx.commit()
  } finally {
    tx.close()
  }
  console.log(`\r  ${stmts.length}/${stmts.length}  ✓`)
}

async function uploadMedia() {
  if (!blobToken) {
    console.log('Media: BLOB_READ_WRITE_TOKEN niet gezet — media-upload overgeslagen.')
    return
  }
  if (!existsSync('media')) {
    console.log('Media: geen ./media-map — niets te uploaden.')
    return
  }
  // The Vercel Blob store is chosen entirely by the token: it must be the token
  // of a PUBLIC store (the adapter uploads with access:'public'), and the same
  // token must be BLOB_READ_WRITE_TOKEN in the production env or the live site
  // resolves media URLs to the wrong store.
  const files = readdirSync('media').filter((f) => !f.startsWith('.'))
  let ok = 0
  for (const name of files) {
    await put(name, readFileSync(`media/${name}`), {
      access: 'public',
      token: blobToken,
      addRandomSuffix: false, // pathname == filename => matches Payload's lookup
      allowOverwrite: true,
    })
    ok++
    process.stdout.write(`\r  ${ok}/${files.length}`)
  }
  console.log(`  ✓ media`)
}

await copyContent()
await uploadMedia()
console.log('Klaar.')
