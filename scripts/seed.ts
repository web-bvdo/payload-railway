// Idempotent seed: creates the first admin user and sample home content.
// Run with: npm run seed
//
// Admin credentials come from env (set them in .env, unique per site):
//   ADMIN_EMAIL, ADMIN_PASSWORD
// If unset, safe local-dev defaults are used and a warning is printed —
// NEVER ship those defaults to a live client site.
import { getPayload } from 'payload'
import config from '../src/payload.config'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme'
const usingDefaults = !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD

const payload = await getPayload({ config: await config })

const users = await payload.count({ collection: 'users' })
if (users.totalDocs === 0) {
  await payload.create({
    collection: 'users',
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  console.log(`Created admin user: ${ADMIN_EMAIL}`)
  if (usingDefaults) {
    console.warn(
      '⚠  Default admin credentials used. Set ADMIN_EMAIL/ADMIN_PASSWORD in .env and change the password in /admin.',
    )
  }
} else {
  console.log('Users already exist, skipping user seed.')
}

const home = await payload.findGlobal({ slug: 'home' })
if (!home.heroTitle) {
  await payload.updateGlobal({
    slug: 'home',
    data: {
      heroTitle: 'Welcome',
      heroSubtitle: 'Edit this text at /admin — no developer needed.',
    },
  })
  console.log('Seeded home content.')
} else {
  console.log('Home content already set, skipping.')
}

process.exit(0)
