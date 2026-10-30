'use client'

import React, { useCallback, useEffect, useState } from 'react'

// Minimale typing van de Usercentrics Browser UI v2-API die we gebruiken.
type UcService = { id: string; name: string; consent: { status: boolean } }
declare global {
  interface Window {
    UC_UI?: {
      isInitialized: () => boolean
      getServicesBaseInfo: () => UcService[]
      acceptService: (id: string) => Promise<void>
      showSecondLayer: () => void // voor een 'Cookie-instellingen'-link in de footer
    }
  }
}

// Zoekt de dienst (hoofdletterongevoelig op naam) zodra Usercentrics klaar is.
// Geen Usercentrics (geen ID, niet-live host) of dienst niet geconfigureerd → undefined.
function findService(service: string): UcService | undefined {
  const uc = window.UC_UI
  if (!uc?.isInitialized()) return undefined
  return uc.getServicesBaseInfo().find((s) => s.name.toLowerCase() === service.toLowerCase())
}

type Props = {
  /** Naam van de dienst zoals in Usercentrics, bv. "Calendly", "YouTube Video". */
  service: string
  /** iframe-src van de embed. */
  src: string
  /** Titel van de iframe (toegankelijkheid). */
  title: string
  /** Vaste hoogte, reserveert de ruimte tegen layoutverschuiving (CLS). */
  height: number | string
  /** Tekst op de knop in de facade. */
  buttonLabel: string
  /** data-track-naam van de knop, bv. "afspraak-calendly-laden". */
  track: string
  /** Optionele uitleg in de facade; standaard een korte zin over de dienst. */
  children?: React.ReactNode
  className?: string
}

// Embed (Calendly, YouTube, kaart…) die pas laadt met toestemming voor die dienst.
// Al geaccepteerd in Usercentrics → iframe meteen. Anders een facade met knop; een klik
// accepteert alléén deze dienst en laadt de iframe. Zonder Usercentrics is het een
// gewone klik-facade. Trekt de bezoeker de toestemming in, dan terug naar de facade.
export function ConsentEmbed({
  service,
  src,
  title,
  height,
  buttonLabel,
  track,
  children,
  className,
}: Props) {
  const [loaded, setLoaded] = useState(false)

  const sync = useCallback(() => {
    const s = findService(service)
    if (s) setLoaded(s.consent.status)
  }, [service])

  useEffect(() => {
    sync()
    const events = ['UC_UI_INITIALIZED', 'UC_UI_CMP_EVENT', 'UC_CONSENT']
    events.forEach((e) => window.addEventListener(e, sync))
    return () => events.forEach((e) => window.removeEventListener(e, sync))
  }, [sync])

  async function load() {
    const s = findService(service)
    if (s) await window.UC_UI!.acceptService(s.id).catch(() => {})
    setLoaded(true)
  }

  return (
    <div className={className} style={{ height }}>
      {loaded ? (
        <iframe
          src={src}
          title={title}
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          <p>
            {children ?? `Deze inhoud wordt geladen via ${service}. Met een klik geef je daar toestemming voor.`}
          </p>
          <button type="button" onClick={load} data-track={track} style={{ minHeight: 44 }}>
            {buttonLabel}
          </button>
        </div>
      )}
    </div>
  )
}
