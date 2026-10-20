#!/usr/bin/env node
// Zet de Railway-instellingen van deze site in .railway/railway.ts (Infrastructure as Code).
// Draai in een site-map die met `railway link` aan het eigen Railway-project hangt:
//   node scripts/railway-iac.mjs
// Geen .railway/railway.ts? Dan eerst `railway config pull` (huidige Railway-staat als code).
// Daarna krijgt de app-service altijd start-commando en healthcheck uit SETTINGS, en verdwijnt
// een oude railway.json. Idempotent. Railway leest .railway/ niet bij een deploy: pas na
// `railway config plan` + `railway config apply` staan de waarden echt op de service.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

const SERVICE = 'payload-railway'
const SETTINGS = {
  start: 'npm run migrate && npm start',
  healthcheck: '/',
  healthcheckTimeout: 600,
}
const FILE = '.railway/railway.ts'

// railway.json (Config as Code) en IaC mogen niet tegelijk dezelfde service beheren.
if (existsSync('railway.json')) rmSync('railway.json')
if (!existsSync(FILE)) execFileSync('railway', ['config', 'pull'], { stdio: 'inherit' })

const lines = readFileSync(FILE, 'utf8').split('\n')
const at = lines.findIndex((l) => l.includes(`service(${JSON.stringify(SERVICE)}, {`))
if (at < 0) {
  console.error(
    `${FILE}: service("${SERVICE}", { … }) niet gevonden; zet de instellingen met de hand.`,
  )
  process.exit(1)
}
const indent = lines[at].match(/^\s*/)[0] + '  '
const keys = Object.keys(SETTINGS)
// Bestaande regels voor deze keys binnen het service-blok weg (tot de afsluitende `});`).
let end = at + 1
while (end < lines.length && !lines[end].startsWith(lines[at].match(/^\s*/)[0] + '}')) end++
const body = lines
  .slice(at + 1, end)
  .filter((l) => !keys.some((k) => l.startsWith(`${indent}${k}:`)))
body.unshift(...keys.map((k) => `${indent}${k}: ${JSON.stringify(SETTINGS[k])},`))
lines.splice(at + 1, end - at - 1, ...body)
writeFileSync(FILE, lines.join('\n'))
console.log(
  `${FILE}: ${SERVICE} → ${keys.join(', ')} gezet. Nu: railway config plan, dan railway config apply.`,
)
