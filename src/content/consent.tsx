import { headers } from 'next/headers'

import { SITE_URL } from './seo'

// Komt het request binnen op het live domein (host van SITE_URL)? Alleen dan laden de
// cookiebanner en GTM: geen banner/tracking op previews, staging of localhost (eis 9.8,
// zelfde logica als de noindex in next.config.ts).
export async function isLiveHost() {
  if (!SITE_URL) return false
  return (await headers()).get('host') === new URL(SITE_URL).host
}

// Usercentrics-cookiebanner (Browser UI v2). Wordt gerenderd door <SiteHead />
// (src/content/head.tsx), na de Consent Mode v2-default en vóór GTM. Laadt alleen als
// USERCENTRICS_ID gezet is én het request op het live domein binnenkomt.
// Teksten, styling, diensten en de Google Consent Mode-schakelaar staan per klant in
// Usercentrics zelf; Usercentrics pusht de consent-update. Zie docs/SEO.md.
export async function Usercentrics() {
  const id = process.env.USERCENTRICS_ID
  if (!id || !(await isLiveHost())) return null

  return (
    <script
      id="usercentrics-cmp"
      src="https://app.usercentrics.eu/browser-ui/latest/loader.js"
      data-settings-id={id}
      // defer i.p.v. async: React 19 hoist `async`-scripts naar de top van <head>, vóór de
      // Consent Mode-default. defer blokkeert ook niet en houdt de volgorde.
      defer
    />
  )
}
