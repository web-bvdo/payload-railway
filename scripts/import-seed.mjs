// Import seed/content.json into the database. Runs on Railway at start, AFTER
// `payload migrate` has created the schema. Idempotent: if content already
// exists it does nothing, so it seeds exactly once and never overwrites edits
// made in the production admin.
import { createClient } from '@libsql/client'
import { readFileSync, existsSync } from 'node:fs'

if (!existsSync('seed/content.json')) {
  console.log('import-seed: no seed/content.json — skip')
  process.exit(0)
}

const db = createClient({
  url: process.env.DATABASE_URI || 'file:payload.db',
  authToken: process.env.DATABASE_AUTH_TOKEN,
})

// Already seeded? (home global has a row) → leave prod data untouched.
const present = await db
  .execute('select count(*) n from home')
  .then((r) => Number(r.rows[0].n))
  .catch(() => 0)
if (present > 0) {
  console.log('import-seed: content already present — skip')
  process.exit(0)
}

const data = JSON.parse(readFileSync('seed/content.json', 'utf8'))
const stmts = []
for (const [t, { columns, rows }] of Object.entries(data)) {
  const sql = `INSERT OR REPLACE INTO "${t}" (${columns.map((c) => `"${c}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`
  for (const vals of rows) stmts.push({ sql, args: vals })
}

// Bound params (no unistr encoding issues) + deferred FK checks (insert order
// doesn't matter, validated at COMMIT when every row is present).
const tx = await db.transaction('write')
try {
  await tx.execute('PRAGMA defer_foreign_keys=ON')
  for (const s of stmts) await tx.execute(s)
  await tx.commit()
} finally {
  tx.close()
}
console.log(`import-seed: seeded ${stmts.length} rows.`)
