#!/usr/bin/env node
// Genereert src/migrations/index.ts uit de migratiebestanden in de map (gesorteerd op naam),
// in hetzelfde formaat als `payload migrate:create`. Gebruik: node scripts/migrations-index.mjs [src/migrations]
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] || 'src/migrations'
const names = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts').map((f) => f.slice(0, -3)).sort()
const out = [
  ...names.map((n) => `import * as migration_${n} from './${n}';`),
  '',
  'export const migrations = [',
  ...names.map((n) => `  {\n    up: migration_${n}.up,\n    down: migration_${n}.down,\n    name: '${n}',\n  },`),
  '];',
  '',
]
writeFileSync(join(dir, 'index.ts'), out.join('\n'))
console.log(`${dir}/index.ts: ${names.length} migraties`)
