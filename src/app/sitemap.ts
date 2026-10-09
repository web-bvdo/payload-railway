import { readdirSync } from 'node:fs'
import path from 'node:path'

import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/content/seo'

// /sitemap.xml — alle vaste routes onder (frontend), automatisch bij de build.
// Dynamische routes ([slug]) en privé-mappen (_components) tellen niet mee; voeg
// die per site toe aan `extra` hieronder. Zonder SITE_URL: lege sitemap.
const extra: string[] = []

export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_URL) return []
  const dir = path.join(process.cwd(), 'src/app/(frontend)')
  const routes = (readdirSync(dir, { recursive: true }) as string[])
    .map((f) => f.split(path.sep))
    .filter((s) => s.at(-1) === 'page.tsx' && !s.some((p) => /^[_[@]/.test(p)))
    .map((s) => '/' + s.slice(0, -1).filter((p) => !p.startsWith('(')).join('/'))
  return [...new Set([...routes, ...extra])].sort().map((r) => ({ url: SITE_URL + r }))
}
