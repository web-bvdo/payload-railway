import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/content/seo'

// /robots.txt. Indexeren blokkeren op niet-live domeinen gebeurt via de
// X-Robots-Tag-header (next.config.ts), niet hier: Google moet die pagina's kunnen
// crawlen om de noindex te zien.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/admin' },
    ...(SITE_URL && { sitemap: `${SITE_URL}/sitemap.xml` }),
  }
}
