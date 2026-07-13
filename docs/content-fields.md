# Nieuwe pagina maken & koppelen aan Payload

Deze gids beschrijft hoe je een pagina bouwt in Next.js en de teksten/afbeeldingen laat
beheren in Payload — zonder dat je collega's code aanraken.

## Het idee in één zin

**Jij** bouwt de pagina (de route en de opmaak) in Next.js. **Payload** levert alleen de
ingevulde waarden. `getContent('<naam>')` koppelt de twee.

De volgorde van velden in Payload bepaalt alleen het admin-formulier — op de site zet jij
elk veld waar je wilt.

---

## Snelste manier: de wizard

```bash
npm run new:page
```

Loopt je stap voor stap door het maken van een pagina (slug, label, URL, en velden één
voor één) en doet daarna **alle 4 de stappen hieronder automatisch**. Je hoeft alleen nog
de content in te vullen op `/admin`.

Liever direct, zonder vragen:

```bash
npm run new:page -- contact --route contact --label "Contact page"
```

De rest van dit document legt uit wat de wizard onder water doet — handig als je iets wilt
aanpassen of begrijpen.

## Hoe het in elkaar zit — de keten

Elke bewerkbare pagina bestaat uit **twee bestanden** die via een register en de
type-generator aan elkaar hangen:

```
1.  src/content/<naam>.ts          ← definieer de velden (een "content-groep")
        │
        │  importeren + toevoegen aan de lijst
        ▼
2.  src/content/globals.ts         ← registreer de groep  ← ZONDER DIT BESTAAT HIJ NIET
        │
        │  payload.config.ts leest contentGlobals automatisch in (niks aanpassen)
        ▼
3.  npm run generate:types         ← maakt getContent('<naam>') getypt
        │
        ▼
4.  src/app/(frontend)/<pad>/page.tsx   ← jouw route: getContent('<naam>') → velden
```

> **Belangrijk:** stap 1 t/m 3 horen altijd bij elkaar. Sla je het registreren (stap 2)
> of `generate:types` (stap 3) over, dan kent Payload de pagina niet en werkt niks. Dit is
> de meestgemaakte fout — zie [Veelgemaakte fouten](#veelgemaakte-fouten).

**Twee namen die je uit elkaar moet houden:**

- De **`slug`** in de content-groep (bv. `'news'`) → dit gebruik je in `getContent('news')`.
- Het **routepad** (de mapnaam onder `(frontend)/`) → dit bepaalt de URL.

Ze mogen verschillen: map `nieuws/` met `getContent('news')` geeft URL `/nieuws`.

---

## Checklist — altijd deze 4 stappen

- [ ] **1.** `src/content/<naam>.ts` aangemaakt met de velden.
- [ ] **2.** Geïmporteerd + toegevoegd aan `contentGlobals` in `src/content/globals.ts`.
- [ ] **3.** `npm run generate:types` gedraaid.
- [ ] **4.** Route gemaakt: `src/app/(frontend)/<pad>/page.tsx` die `getContent('<naam>')` aanroept.

---

## Stap voor stap — voorbeeld: een contact-pagina

### Stap 1 — Velden definiëren

Maak `src/content/contact.ts`:

```ts
import type { GlobalConfig } from 'payload'

export const contact = {
  slug: 'contact',
  label: 'Contact page',
  access: { read: () => true }, // publiek leesbaar op de site
  admin: { group: 'Content' }, // zet 'm onder "Content" in de admin-sidebar
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'intro', type: 'richText' },
    { name: 'email', type: 'text' },
    { name: 'phone', type: 'text' },
  ],
} satisfies GlobalConfig
```

> Gebruik `satisfies GlobalConfig` (niet `: GlobalConfig`). Dan controleert TypeScript de
> vorm én blijft de `slug` exact getypt, zodat `getContent('contact')` klopt.

### Stap 2 — Registreren

In `src/content/globals.ts`:

```ts
import { home } from './home'
import { about } from './about'
import { news } from './news'
import { contact } from './contact' // ← nieuw

export const contentGlobals = [home, about, news, contact] // ← toevoegen
```

`payload.config.ts` hoef je niet aan te raken — die leest `contentGlobals` automatisch.

### Stap 3 — Types genereren

```bash
npm run generate:types
```

Nu is `getContent('contact')` getypt en geeft het `{ title, intro, email, phone }` terug.

### Stap 4 — De route bouwen

Maak `src/app/(frontend)/contact/page.tsx`. Jij bepaalt de opmaak:

```tsx
import { getContent, Rich } from '@/content'

export default async function ContactPage() {
  const c = await getContent('contact')
  return (
    <article>
      <h1>{c.title}</h1>
      <Rich field={c.intro} />
      {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
      {c.phone && <p>{c.phone}</p>}
    </article>
  )
}
```

Start `npm run dev`, open **/admin → Content → Contact page**, vul in, en bezoek `/contact`.

---

## Veldtypes die je kunt aanbieden

Elk veld is een object in de `fields`-array. Hieronder per type wat het is, wat je collega
ziet, en een concreet voorbeeld om te kopiëren:

| Type | Waarvoor / wat je collega ziet | Voorbeeld |
|------|--------------------------------|-----------|
| `text` | korte tekst (kop, label) → invoerveld | `{ name: 'title', type: 'text', required: true }` |
| `textarea` | langere platte tekst → tekstvak | `{ name: 'summary', type: 'textarea' }` |
| `richText` | opgemaakte tekst (vet, links, lijsten) → editor | `{ name: 'body', type: 'richText' }` |
| `number` | getallen → numeriek veld | `{ name: 'price', type: 'number' }` |
| `checkbox` | aan/uit → vinkje | `{ name: 'featured', type: 'checkbox' }` |
| `select` | keuze uit opties → dropdown | `{ name: 'status', type: 'select', options: ['concept', 'live'] }` |
| `date` | datum → datumkiezer | `{ name: 'publishedDate', type: 'date' }` |
| `upload` | afbeelding/bestand → upload + mediabibliotheek | `{ name: 'image', type: 'upload', relationTo: 'media' }` |
| `array` | herhaalbare rijen (nieuws, team, FAQ) → "Add row"-lijst | `{ name: 'faq', type: 'array', fields: [ { name: 'question', type: 'text' }, { name: 'answer', type: 'richText' } ] }` |
| `group` | velden bij elkaar → ingeklapte sectie | `{ name: 'seo', type: 'group', fields: [ { name: 'metaTitle', type: 'text' } ] }` |

Zo ziet een `fields`-array met een paar types er samen uit:

```ts
fields: [
  { name: 'title', type: 'text', required: true },
  { name: 'featured', type: 'checkbox' },
  { name: 'status', type: 'select', options: ['concept', 'live'] },
  { name: 'hero', type: 'upload', relationTo: 'media' },
  {
    name: 'faq',
    type: 'array',
    fields: [
      { name: 'question', type: 'text', required: true },
      { name: 'answer', type: 'richText' },
    ],
  },
]
```

Alles wat Payload ondersteunt kan; dit zijn de meestgebruikte.

## Velden uitlezen in je pagina

De helpers komen allemaal uit `@/content` ([`src/content/index.tsx`](../src/content/index.tsx)):

| Veldtype | Zo lees je het uit |
|----------|--------------------|
| `text`, `textarea`, `number`, `select`, `checkbox`, `date` | `{c.veldnaam}` |
| `richText` | `<Rich field={c.veldnaam} />` |
| `upload` (afbeelding) | `<Img field={c.veldnaam} />` — accepteert `width`, `height`, `className`, `priority`, `alt` |
| `array` (repeater) | `c.veldnaam?.map((rij) => ...)` — gebruik `key={rij.id}` |
| `group` | `c.groepnaam.subveld` |

`getContent()` haalt afbeeldingen automatisch volledig op (`depth: 2`), dus `<Img>` werkt
direct zonder extra query.

---

## Herhaalbare content (repeater)

`array` geeft je collega's een lijst waar ze rijen aan toevoegen. Voorbeeld — een
nieuwslijst (zie de echte [`news.ts`](../src/content/news.ts)):

```ts
{
  name: 'articles',
  type: 'array',
  fields: [
    { name: 'headline', type: 'text', required: true },
    { name: 'content', type: 'richText' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'publishedDate', type: 'date' },
  ],
}
```

```tsx
{c.articles?.map((article) => (
  <section key={article.id}>
    <h2>{article.headline}</h2>
    {article.publishedDate && (
      <time dateTime={article.publishedDate}>
        {new Date(article.publishedDate).toLocaleDateString('nl-NL')}
      </time>
    )}
    <Img field={article.image} />
    <Rich field={article.content} />
  </section>
))}
```

## Gedeelde content (menu, footer)

Content die op elke pagina terugkomt zet je in één groep en lees je uit in je layout:

1. Maak `src/content/site.ts` met bv. `navItems` (array) en `footerText`.
2. Registreer in `globals.ts`.
3. In `src/app/(frontend)/layout.tsx`: `const site = await getContent('site')` en render
   het menu/footer eromheen.

---

## Veelgemaakte fouten

| Symptoom | Oorzaak | Oplossing |
|----------|---------|-----------|
| Pagina niet in de admin; `getContent('x')` geeft een TS-fout of crasht | Groep **niet geregistreerd** in `globals.ts` (stap 2 vergeten) | Toevoegen aan `contentGlobals`, daarna `npm run generate:types` |
| `getContent('x')` bestaat niet / velden niet getypt | `npm run generate:types` niet gedraaid na een wijziging | Draai `npm run generate:types` |
| Er verschijnt een rare waarde zoals een datum-timestamp | Je rendert een systeemveld als `c.createdAt` i.p.v. je eigen veld | Gebruik je eigen veldnaam, bv. `{c.title}` |
| Afbeelding blijft leeg | Veld nog niet ingevuld in `/admin`, of geen `relationTo: 'media'` | Vul in bij admin / controleer het veld |
| `Cannot import ... server-only` of client-fout | `@/content` geïmporteerd in een client component | `@/content` alleen in server components (geen `'use client'`) |
| Dev-server blokkeert lang bij "rename table" | Global **verwijderd of hernoemd**; SQLite-autopush raakt in de war | In dev: stop de server, gooi `payload.db` weg, herstart |

---

## Bestaande voorbeelden om van te kopiëren

| Bestand | Laat zien |
|---------|-----------|
| [`src/content/home.ts`](../src/content/home.ts) | de simpelste vorm (losse tekst + afbeelding) |
| [`src/content/about.ts`](../src/content/about.ts) | een `array`-repeater (team) |
| [`src/content/news.ts`](../src/content/news.ts) | een lijst met kop, datum en afbeelding per rij |

En de bijbehorende routes onder [`src/app/(frontend)/`](../src/app/(frontend)/).
