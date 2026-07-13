// Voegt een nieuwe bewerkbare pagina toe en doet alle 4 stappen:
//   1. src/content/<slug>.ts        (velden)
//   2. registreren in globals.ts
//   3. src/app/(frontend)/<route>/page.tsx  (route)
//   4. npm run generate:types
//
// Twee manieren:
//   npm run new:page                → interactieve wizard (stap voor stap)
//   npm run new:page -- <slug> [--route <pad>] [--label "<label>"]  → snel, non-interactief
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rel = (p) => path.relative(root, p)
const globalsFile = path.join(root, 'src/content/globals.ts')

const contentFileFor = (slug) => path.join(root, 'src/content', `${slug}.ts`)
const pageFileFor = (route) => path.join(root, 'src/app/(frontend)', route, 'page.tsx')
const camelize = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
const pascalize = (s) => {
  const c = camelize(s)
  return c.charAt(0).toUpperCase() + c.slice(1)
}

const FIELD_TYPES = [
  'text',
  'textarea',
  'richText',
  'number',
  'checkbox',
  'select',
  'date',
  'upload',
]

// ── args ──
const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf('--' + name)
  return i >= 0 ? args[i + 1] : undefined
}
const argSlug = args.find((a) => !a.startsWith('--'))

const plan = argSlug ? fromArgs() : await wizard()
generate(plan)

// ─────────────────────────────────────────────────────────────

function fromArgs() {
  if (!/^[a-z][a-z0-9-]*$/.test(argSlug)) {
    console.error('✗ Ongeldige slug. Kleine letters/cijfers/streepjes, bv. contact, blog.')
    process.exit(1)
  }
  const route = flag('route') ?? argSlug
  if (existsSync(contentFileFor(argSlug))) exit(`Bestaat al: ${rel(contentFileFor(argSlug))}`)
  if (existsSync(pageFileFor(route))) exit(`Bestaat al: ${rel(pageFileFor(route))}`)
  return {
    slug: argSlug,
    route,
    label: flag('label') ?? pascalize(argSlug) + ' page',
    fields: defaultFields(),
  }
}

async function wizard() {
  // Regel-wachtrij: werkt zowel bij interactief typen als bij gepipete input.
  // (readline.question() verliest regels bij een pipe; dit niet.)
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const queued = []
  const waiters = []
  let closed = false
  rl.on('line', (l) => (waiters.length ? waiters.shift()(l) : queued.push(l)))
  rl.on('close', () => {
    closed = true
    while (waiters.length) waiters.shift()(null)
  })
  const nextLine = () =>
    queued.length ? Promise.resolve(queued.shift()) : closed ? Promise.resolve(null) : new Promise((r) => waiters.push(r))

  const ask = async (q, def) => {
    process.stdout.write(def !== undefined ? `${q} [${def}]: ` : `${q}: `)
    const line = await nextLine()
    if (line === null) {
      if (def !== undefined) return def
      console.error('\n✗ Geen invoer meer (EOF). Afgebroken.')
      process.exit(1)
    }
    return line.trim() || def || ''
  }

  console.log('\n📄 Nieuwe pagina maken — beantwoord de vragen (Enter = standaard).\n')

  // slug
  let slug
  for (;;) {
    slug = (await ask('1/4  Slug (bv. contact, blog)')).toLowerCase()
    if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
      console.log('     ✗ alleen kleine letters, cijfers en streepjes\n')
      continue
    }
    if (existsSync(contentFileFor(slug))) {
      console.log('     ✗ bestaat al, kies een andere\n')
      continue
    }
    break
  }

  const label = await ask('2/4  Label (titel in de admin)', pascalize(slug) + ' page')

  let route
  for (;;) {
    route = await ask('3/4  URL-pad', slug)
    if (existsSync(pageFileFor(route))) {
      console.log('     ✗ route bestaat al, kies een ander pad\n')
      continue
    }
    break
  }

  // fields
  console.log('\n4/4  Velden toevoegen — Enter bij de naam om te stoppen.')
  const fields = []
  for (;;) {
    const name = await ask(`     Veld ${fields.length + 1} — naam (leeg = klaar)`)
    if (!name) break
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name)) {
      console.log('     ✗ ongeldige veldnaam (letters/cijfers, geen spaties)')
      continue
    }
    console.log('       type:  ' + FIELD_TYPES.map((t, i) => `[${i + 1}] ${t}`).join('  '))
    let type
    for (;;) {
      const n = parseInt(await ask('       keuze (nummer)', '1'), 10)
      if (n >= 1 && n <= FIELD_TYPES.length) {
        type = FIELD_TYPES[n - 1]
        break
      }
      console.log(`       ✗ kies 1-${FIELD_TYPES.length}`)
    }
    const f = { name, type }
    if (type === 'select') {
      const opts = await ask('       opties (komma-gescheiden)', 'optie1, optie2')
      f.options = opts.split(',').map((s) => s.trim()).filter(Boolean)
    }
    if (type !== 'checkbox') {
      f.required = /^j/i.test(await ask('       verplicht? (j/N)', 'N'))
    }
    fields.push(f)
    console.log(`       ✓ ${name} (${type})\n`)
  }
  if (fields.length === 0) {
    fields.push(...defaultFields())
    console.log('     (geen velden opgegeven → standaard: title, intro)')
  }

  // bevestigen
  console.log(
    `\nOverzicht:\n  bestand : src/content/${slug}.ts\n  admin   : Content → ${label}\n  URL     : /${route}\n  velden  : ${fields.map((f) => `${f.name}:${f.type}`).join(', ')}`,
  )
  const ok = /^j/i.test(await ask('\nAanmaken? (J/n)', 'J'))
  rl.close()
  if (!ok) {
    console.log('Geannuleerd.')
    process.exit(0)
  }
  return { slug, route, label, fields }
}

function generate({ slug, route, label, fields }) {
  const camel = camelize(slug)
  const pascal = pascalize(slug)

  // 1. content-bestand
  const contentFile = contentFileFor(slug)
  writeFileSync(
    contentFile,
    `import type { GlobalConfig } from 'payload'

// Bewerkbare content voor de ${slug}-pagina.
// Alle veldtypes + voorbeelden: docs/content-fields.md.
export const ${camel} = {
  slug: '${slug}',
  label: '${label}',
  access: { read: () => true },
  admin: { group: 'Content' },
  fields: [
${fields.map(fieldSource).join('\n')}
  ],
} satisfies GlobalConfig
`,
  )
  console.log('✓ 1. velden        →', rel(contentFile))

  // 2. registreren
  registerGlobal(slug, camel)

  // 3. route
  const pageFile = pageFileFor(route)
  mkdirSync(path.dirname(pageFile), { recursive: true })
  writeFileSync(pageFile, pageSource(slug, pascal, fields))
  console.log('✓ 3. route         →', rel(pageFile))

  // 4. types
  console.log('… 4. npm run generate:types')
  execSync('npm run generate:types', { cwd: root, stdio: 'inherit' })

  console.log(`
✅ Pagina '${slug}' aangemaakt.

Volgende stappen:
  1. Pas velden aan in ${rel(contentFile)} (daarna: npm run generate:types)
  2. Herstart de dev-server (npm run dev) zodat de database-tabel wordt aangemaakt
  3. Vul de content in op /admin → Content → ${label}
  4. Bekijk de pagina op /${route}
`)
}

function defaultFields() {
  return [
    { name: 'title', type: 'text', required: true },
    { name: 'intro', type: 'richText' },
  ]
}

function fieldSource(f) {
  const parts = [`name: '${f.name}'`, `type: '${f.type}'`]
  if (f.type === 'upload') parts.push(`relationTo: 'media'`)
  if (f.type === 'select') parts.push(`options: [${f.options.map((o) => `'${o}'`).join(', ')}]`)
  if (f.required) parts.push('required: true')
  return `    { ${parts.join(', ')} },`
}

function pageSource(slug, pascal, fields) {
  const needsRich = fields.some((f) => f.type === 'richText')
  const needsImg = fields.some((f) => f.type === 'upload')
  const imports = ['getContent', needsRich && 'Rich', needsImg && 'Img'].filter(Boolean)

  let usedH1 = false
  const body = fields
    .map((f) => {
      if (f.type === 'richText') return `      <Rich field={c.${f.name}} />`
      if (f.type === 'upload') return `      <Img field={c.${f.name}} />`
      if (!usedH1) {
        usedH1 = true
        return `      <h1>{c.${f.name}}</h1>`
      }
      return `      <p>{c.${f.name}}</p>`
    })
    .join('\n')

  return `import { ${imports.join(', ')} } from '@/content'

// Jij bepaalt de layout; Payload levert de teksten/afbeeldingen.
export default async function ${pascal}Page() {
  const c = await getContent('${slug}')

  return (
    <article>
${body}
    </article>
  )
}
`
}

function registerGlobal(slug, camel) {
  let g = readFileSync(globalsFile, 'utf8')
  if (new RegExp(`from '\\./${slug}'`).test(g)) {
    console.log('✓ 2. al geregistreerd in globals.ts')
    return
  }
  const importLine = `import { ${camel} } from './${slug}'`
  const importRe = /^import .+ from '\.\/.+'[ \t]*$/gm
  let last
  for (let m; (m = importRe.exec(g)); ) last = m
  if (last) {
    const at = last.index + last[0].length
    g = g.slice(0, at) + '\n' + importLine + g.slice(at)
  } else {
    g = importLine + '\n' + g
  }
  g = g.replace(/export const contentGlobals = \[([\s\S]*?)\]/, (_, inner) => {
    const names = inner.split(',').map((s) => s.trim()).filter(Boolean)
    names.push(camel)
    return `export const contentGlobals = [${names.join(', ')}]`
  })
  writeFileSync(globalsFile, g)
  console.log('✓ 2. geregistreerd →', rel(globalsFile))
}

function exit(msg) {
  console.error('✗ ' + msg)
  process.exit(1)
}
