# Payload + Next.js — agency site template

A starter for building client marketing sites where **developers build the pages** in
Next.js and **non-developers edit the text and images** in Payload (`/admin`).

Content is **field-level, ACF-style**: you define named fields, then pull them into your
own hand-built pages by key — you decide where each field goes, not Payload. No
block/page-builder.

> **Building in this repo (human or AI)?** Read **[CLAUDE.md](CLAUDE.md)** first — it's the
> full working guide. Running it across multiple client sites? See
> **[docs/MAINTAINING.md](docs/MAINTAINING.md)**.

## Quick start (new site)

```bash
npm install
npm run setup        # creates .env with a unique PAYLOAD_SECRET
npm run seed         # first admin user (from .env) + sample home content
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

Default admin comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (defaults to
`admin@example.com` / `changeme` — change them). SQLite by default, so no database server.

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

## Stack

Next.js 15 (App Router) · Payload CMS 3 · SQLite (dev) · React 19 · TypeScript. For
production databases and media, and the multi-site update flow, see
[docs/MAINTAINING.md](docs/MAINTAINING.md).
