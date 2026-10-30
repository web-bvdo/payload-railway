import React from 'react'

import { Usercentrics } from './consent'

// Vaste plek voor alles in <head> dat van de template komt. De frontend-layout is
// site-specifiek; daar staat alleen <head><SiteHead /></head>. Nieuwe head-code komt hier,
// nooit direct in de layout, zodat ze zonder conflict via `fleet sync` bij elke site landt.
//
// Volgorde (komt later, SEO-eisen 9.1, 9.2 en 9.6):
//   1. Consent Mode v2-default (`denied`), vóór GTM
//   2. Google Tag Manager
//   3. extra head-code (per site, bv. verificatie-tags)
// Usercentrics (cookiebanner) staat er nu al in; zie docs/SEO.md.
export function SiteHead() {
  return <Usercentrics />
}
