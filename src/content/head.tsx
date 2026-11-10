import React from 'react'

import { isLiveHost, Usercentrics } from './consent'

// Google Consent Mode v2: alles `denied` tot Usercentrics de keuze van de bezoeker pusht
// (gtag('consent','update',…)). wait_for_update geeft de async geladen banner de tijd
// die update te sturen voordat tags vuren (waarde volgens de Usercentrics-docs).
const CONSENT_DEFAULT = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:2000});`

// Standaard GTM-snippet. Het ID komt uit een env-var en belandt in een inline script:
// alleen een geldig GTM-ID komt erdoor.
const gtmSnippet = (id: string) =>
  `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`

// Vaste plek voor alles in <head> dat van de template komt. De frontend-layout is
// site-specifiek; daar staat alleen <head><SiteHead /></head>. Nieuwe head-code komt hier,
// nooit direct in de layout, zodat ze zonder conflict via `fleet sync` bij elke site landt.
//
// Volgorde (SEO-eisen 9.1, 9.2, 9.6 en 9.8), alleen op het live domein (SITE_URL):
//   1. Consent Mode v2-default (`denied`), als GTM of Usercentrics aan staat
//   2. Usercentrics (USERCENTRICS_ID), pusht de consent-update
//   3. Google Tag Manager (GTM_ID)
//   4. extra head-code (per site, bv. verificatie-tags), komt later
// Zie docs/SEO.md.
export async function SiteHead() {
  if (!(await isLiveHost())) return null
  const gtmId = process.env.GTM_ID?.trim()
  const gtm = gtmId && /^GTM-[A-Z0-9]+$/.test(gtmId) ? gtmId : null
  if (!gtm && !process.env.USERCENTRICS_ID) return null

  return (
    <>
      <script id="consent-default" dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT }} />
      <Usercentrics />
      {gtm && <script id="gtm" dangerouslySetInnerHTML={{ __html: gtmSnippet(gtm) }} />}
    </>
  )
}
