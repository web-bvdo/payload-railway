// One-time project setup for a new site: creates .env from .env.example with a
// freshly generated PAYLOAD_SECRET. Safe to run again — it never overwrites.
// Run with: npm run setup
import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = path.join(root, '.env')
const exampleFile = path.join(root, '.env.example')

if (existsSync(envFile)) {
  console.log('.env bestaat al — niks gedaan. (Verwijder het handmatig als je opnieuw wilt beginnen.)')
  process.exit(0)
}

copyFileSync(exampleFile, envFile)
const secret = randomBytes(24).toString('hex')
const env = readFileSync(envFile, 'utf8').replace(/^PAYLOAD_SECRET=.*$/m, `PAYLOAD_SECRET=${secret}`)
writeFileSync(envFile, env)

console.log(`✅ .env aangemaakt met een unieke PAYLOAD_SECRET.

Volgende stappen:
  1. (optioneel) Pas ADMIN_EMAIL / ADMIN_PASSWORD aan in .env
  2. npm run seed      # maakt de admin-gebruiker + home-content
  3. npm run dev       # site op http://localhost:3000, admin op /admin
`)
