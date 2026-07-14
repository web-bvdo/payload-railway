# Payload + Next.js — agency site template

A starter for building client marketing sites where **developers build the pages** in
Next.js and **non-developers edit the text and images** in Payload (`/admin`).

Content is **field-level, ACF-style**: you define named fields, then pull them into your
own hand-built pages by key — you decide where each field goes, not Payload. No
block/page-builder.

> **This repo is the template.** For a client site, don't develop in it — make your own copy
> and point Railway at it. Start at **[docs/NEW-SITE.md](docs/NEW-SITE.md)**. Building/editing
> the template itself? Read **[CLAUDE.md](CLAUDE.md)** first.

Runs on **Railway**: a **Postgres** service (database) + a **Bucket** (media). One click from
the template provisions both, wired to the app.

## Run it locally

After you have your own copy (see [docs/NEW-SITE.md](docs/NEW-SITE.md)):

```bash
npm install
npm run setup        # creates .env with a unique PAYLOAD_SECRET
# then set DATABASE_URI in .env → a Postgres (Railway public URL, or a local Postgres)
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin → **create the first user** (or `npm run seed` for a fresh DB)

Locally, image uploads fall back to `./media` when the `S3_*` vars are unset. Full local
workflow (which database, adding fields, migrations): **[docs/DEVELOPING.md](docs/DEVELOPING.md)**.

## The idea

You build a normal Next.js page and drop in content fields wherever you want:

```tsx
// src/app/(frontend)/page.tsx — you own the layout
import { getContent, Img, Rich } from '@/content'

export default async function HomePage() {
  const c = await getContent('home') // typed: c.heroTitle, c.heroImage, …
  return (
    <>
      <h1>{c.heroTitle}</h1>
      <Img field={c.heroImage} />
      <MyOwnComponent />
      <Rich field={c.intro} />
    </>
  )
}
```

Your non-dev colleagues fill in the fields at **/admin → Content**. The field order in
Payload only affects the admin form — on the site you place fields anywhere.

## Add a page

```bash
npm run new:page      # interactive wizard — does all 4 steps
```

Or by hand (define fields → register in `globals.ts` → `generate:types` → build the route).
Full guide with examples: **[docs/content-fields.md](docs/content-fields.md)**.

## Helpers (`@/content`, server-only)

| Helper | Use for |
|--------|---------|
| `getContent('home')` | fetch a page's values, fully typed |
| `<Img field={c.x} />` | an `upload` (image) field → `next/image` |
| `<Rich field={c.x} />` | a `richText` field |
| `{c.x}` | plain `text` / `textarea` / `number` / … fields |

## Commands

| Command | Doet |
|---------|------|
| `npm run setup` | `.env` aanmaken met unieke secret (nieuwe site) |
| `npm run seed` | eerste admin + home-content |
| `npm run dev` | dev-server |
| `npm run new:page` | pagina toevoegen (wizard) |
| `npm run generate:types` | types opnieuw genereren (na content-wijziging) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` / `npm start` | productie |

## Docs (read in this order)

1. **[docs/NEW-SITE.md](docs/NEW-SITE.md)** — start a client site: copy the template, deploy on Railway, point Railway at your copy.
2. **[docs/DEVELOPING.md](docs/DEVELOPING.md)** — day-to-day local development.
3. **[docs/content-fields.md](docs/content-fields.md)** — add pages & fields (with examples).
4. **[docs/CONTENT.md](docs/CONTENT.md)** — content model + promoting content staging → prod.
5. **[docs/DEPLOY-RAILWAY.md](docs/DEPLOY-RAILWAY.md)** — the Railway setup (Postgres + Bucket + vars) and deploys.
6. **[docs/MAINTAINING.md](docs/MAINTAINING.md)** — many client sites + pushing template fixes to them.
7. **[CLAUDE.md](CLAUDE.md)** — full working guide for building in the template.

## Stack

Next.js 15 (App Router) · Payload CMS 3 · Postgres · React 19 · TypeScript. Hosted on
Railway (Postgres service + Bucket for media).
