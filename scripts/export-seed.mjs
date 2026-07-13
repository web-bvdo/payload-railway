// Export site CONTENT to seed/content.json — safe to commit (skips the users /
// sessions / prefs tables, so no credentials leave the machine). Re-run whenever
// the local content changes and you want it in the repo:  npm run export:seed
//
// This is the "export" half of moving data to production. The "import" half
// (scripts/import-seed.mjs) runs on Railway at start and loads this file into
// the volume database.
import { createClient } from '@libsql/client'
import { mkdirSync, writeFileSync } from 'node:fs'

// Auth/system tables stay per-environment (prod has its own admin + migration
// state). Never export the users table — it holds password hashes + sessions.
const SKIP = new Set([
  'users', 'users_sessions', 'payload_migrations', 'payload_kv',
  'payload_preferences', 'payload_preferences_rels',
  'payload_locked_documents', 'payload_locked_documents_rels',
])

const out = process.argv[2] || 'seed/content.json'
const db = createClient({ url: 'file:payload.db' })

const { rows: trows } = await db.execute(
  "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name",
)
const tables = trows.map((r) => r.name).filter((n) => !SKIP.has(n))

const data = {}
let total = 0
for (const t of tables) {
  const res = await db.execute(`SELECT * FROM "${t}"`)
  if (!res.rows.length) continue
  for (const r of res.rows) {
    for (const c of res.columns) {
      const v = r[c]
      if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) {
        throw new Error(`Blob in ${t}.${c}: this exporter handles text/number/null only`)
      }
    }
  }
  data[t] = { columns: res.columns, rows: res.rows.map((r) => res.columns.map((c) => r[c])) }
  total += res.rows.length
}

mkdirSync(out.replace(/\/[^/]+$/, '') || '.', { recursive: true })
writeFileSync(out, JSON.stringify(data))
console.log(`Exported ${total} rows from ${Object.keys(data).length} tables -> ${out}`)
