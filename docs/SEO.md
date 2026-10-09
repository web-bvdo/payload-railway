# SEO

Wat de template regelt, en wat je per site moet doen.

## Automatisch (core)

| Wat | Waar |
|---|---|
| **Noindex op alles behalve het echte domein.** Elke response krijgt `X-Robots-Tag: noindex, nofollow`, tenzij de host gelijk is aan `SITE_URL`. Dus `*.up.railway.app`, staging en een site zonder `SITE_URL` komen nooit in Google. | `next.config.ts` |
| `/robots.txt`: alles mag behalve `/admin`; met de sitemap-regel als `SITE_URL` gezet is | `src/app/robots.ts` |
| `/sitemap.xml`: alle vaste routes onder `(frontend)`, automatisch bij de build | `src/app/sitemap.ts` |
| 301-redirects van oude URL's | `redirects.json` |
| Velden voor SEO-titel, -omschrijving en social-afbeelding in de admin, plus een helper voor de metadata | `src/content/seo.ts` |

## Per site

1. **Layout** (`src/app/(frontend)/layout.tsx`): `lang="nl"`, `metadataBase: siteUrl`, een
   echte `title: { default, template }`, `description` en `openGraph.siteName`.
2. **Elke pagina** heeft een eigen titel en omschrijving:
   ```ts
   import { seoMetadata } from '@/content/seo'
   export async function generateMetadata() {
     const c = await getContent('contact')
     return seoMetadata(c.seo, { title: 'Contact', description: '…', path: '/contact' })
   }
   ```
   Wil de klant of marketeer titel en omschrijving zelf aanpassen? Zet dan `seoFields`
   in de content-groep (de wizard `npm run new:page` doet dit al) en maak een migratie.
   Zonder admin-velden geef je `null` mee: `seoMetadata(null, { … })`.
3. **Eén `<h1>` per pagina** en een `alt`-tekst bij elke afbeelding.
4. **Dynamische routes** (`[slug]`) voeg je toe aan `extra` in `src/app/sitemap.ts`.

## Livegang (checklist)

- [ ] Custom domein gekoppeld in Railway.
- [ ] **`SITE_URL=https://www.klant.nl`** gezet op de production-service (zonder `/` aan
      het eind, precies het domein dat in Google moet komen, met of zonder `www`).
      Railway deployt opnieuw. `SITE_URL` wordt bij de **build** ingelezen.
- [ ] Het andere domein (www tegenover zonder www) stuurt door naar `SITE_URL`, via DNS of
      de registrar. Doet het dat niet, dan krijgt het noindex en is er geen dubbele
      content, maar ook geen doorverwijzing.
- [ ] **Vervangt de site een bestaande website?** Zet alle oude URL's die anders worden
      in `redirects.json`, anders verlies je hun ranking:
      ```json
      [{ "source": "/oude-pagina", "destination": "/nieuwe-pagina", "permanent": true }]
      ```
      Haal de oude URL's uit de oude `sitemap.xml` of uit Search Console → Pagina's.
- [ ] Controle: `curl -sI https://www.klant.nl | grep -i robots`. Dit moet **leeg** zijn. En
      `https://www.klant.nl/sitemap.xml` moet alle pagina's tonen.
- [ ] Sitemap ingediend in Google Search Console.
