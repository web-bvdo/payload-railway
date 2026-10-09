import type { Metadata } from 'next'
import React from 'react'

import { siteUrl } from '@/content/seo'
import './styles.css'

// Content lives in the DB, which isn't populated at build time (migrations run
// at start, and on volume hosts the DB may not exist during build). Render at
// request time instead of prerendering. Applies to the whole (frontend) subtree.
export const dynamic = 'force-dynamic'

// Per site invullen: naam, standaardtitel en -omschrijving. Pagina's zetten hun eigen
// titel met seoMetadata() (src/content/seo.ts); de template plakt '| Site' erachter.
export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: 'Site', template: '%s | Site' },
  description: 'Editable Next.js site powered by Payload.',
  openGraph: { siteName: 'Site', locale: 'nl_NL', type: 'website' },
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="nl">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
