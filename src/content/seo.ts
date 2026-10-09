import type { Metadata } from 'next'
import type { Field } from 'payload'

import type { Media } from '@/payload-types'

// Het echte domein van de site, bv. https://www.klant.nl. Zet SITE_URL alléén op de
// production-omgeving, bij livegang. Zonder SITE_URL (of op een ander domein, zoals
// *.up.railway.app) krijgt elke pagina `X-Robots-Tag: noindex` (next.config.ts) en
// is de sitemap leeg. Zie docs/SEO.md.
export const SITE_URL = process.env.SITE_URL?.replace(/\/$/, '')

// Basis voor absolute URL's (canonical, og:image) → metadataBase in de layout.
export const siteUrl = new URL(
  SITE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : 'http://localhost:3000'),
)

// SEO-velden voor een content-groep: zet `seoFields` onderaan in `fields: [...]`
// en lees ze in de route uit met seoMetadata(c.seo, …). Leeg = default uit de code.
export const seoFields: Field = {
  name: 'seo',
  type: 'group',
  label: 'SEO',
  admin: { description: 'Leeg laten = de standaardtekst uit de code.' },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: { description: 'Titel in Google, ± 50–60 tekens.' },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Tekst onder de titel in Google, ± 120–155 tekens.' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Afbeelding bij delen op social media (1200×630).' },
    },
  ],
}

type Seo = {
  title?: string | null
  description?: string | null
  image?: number | Media | null
} | null

// Metadata voor één pagina: admin-waarden (seo) winnen van de defaults uit de code.
//   export async function generateMetadata() {
//     const c = await getContent('contact')
//     return seoMetadata(c.seo, { title: 'Contact', description: '…', path: '/contact' })
//   }
// Geen seo-velden op de pagina? Geef null mee.
export function seoMetadata(
  seo: Seo | undefined,
  d: { title: string; description: string; path: string },
): Metadata {
  const title = seo?.title || d.title
  const description = seo?.description || d.description
  const image = seo?.image && typeof seo.image === 'object' ? seo.image.url : null
  return {
    title,
    description,
    alternates: { canonical: d.path },
    openGraph: {
      title,
      description,
      url: d.path,
      type: 'website',
      locale: 'nl_NL',
      ...(image && { images: [image] }),
    },
  }
}
