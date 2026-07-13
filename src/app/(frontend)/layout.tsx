import React from 'react'
import './styles.css'

// Content lives in the DB, which isn't populated at build time (migrations run
// at start, and on volume hosts the DB may not exist during build). Render at
// request time instead of prerendering. Applies to the whole (frontend) subtree.
export const dynamic = 'force-dynamic'

export const metadata = {
  description: 'Editable Next.js site powered by Payload.',
  title: 'Site',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
