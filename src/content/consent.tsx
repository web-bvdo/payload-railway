import { headers } from 'next/headers'

import { SITE_URL } from './seo'

// Usercentrics-cookiebanner (Browser UI v2). Zet <Usercentrics /> in de <head> van de
// frontend-layout. Laadt alleen als USERCENTRICS_ID gezet is én het request op het live
// domein (host van SITE_URL) binnenkomt: geen banner/tracking op previews, staging of
// localhost (eis 9.8, zelfde logica als de noindex in next.config.ts).
// Teksten, styling en diensten staan per klant in Usercentrics zelf. Zie docs/SEO.md.
// Consent Mode v2 / GTM komen later vóór deze tag in de <head>.
export async function Usercentrics() {
  const id = process.env.USERCENTRICS_ID
  if (!id || !SITE_URL) return null
  const host = (await headers()).get('host')
  if (host !== new URL(SITE_URL).host) return null

  return (
    <script
      id="usercentrics-cmp"
      src="https://app.usercentrics.eu/browser-ui/latest/loader.js"
      data-settings-id={id}
      async
    />
  )
}
