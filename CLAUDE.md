# CLAUDE.md — guide for AI agents & developers

This file tells an AI coding agent (and new developers) how this project works and how to
work in it. Read it fully before making changes.

## What this project is

A **starter template** for building client marketing sites. Model:

- **Developers build the pages** in Next.js (routes + layout + styling).
- **Non-developers edit the text and images** in the Payload admin (`/admin`).

Content is **field-level, ACF-style** (like WordPress ACF): you define named fields, then
pull them into hand-built pages by key with `getContent(...)`. It is **not** a block /
page-builder — that was deliberately removed. Do not reintroduce one.

Stack: Next.js 15 (App Router) · Payload CMS 3 · Postgres (Railway) · React 19 · TypeScript.

## Golden rules

0. **This repo is the template — don't develop in it per client.** For each client site,
   make your own copy (`Use this template` → new repo) and point Railway at that copy. See
   [docs/NEW-SITE.md](docs/NEW-SITE.md). Edits here are template-wide, not per-site.
1. **Add a page with the wizard:** `npm run new:page`. It does all 4 steps. Prefer it over
   doing them by hand.
2. **After changing any content fields, run `npm run generate:types`.** Types drive
   everything; stale types = wrong or missing fields.
3. **A page needs all 3 parts or it silently won't work:** a content group in
   `src/content/<slug>.ts`, registered in `src/content/globals.ts`, AND regenerated types.
   Forgetting to register is the #1 mistake.
4. **`@/content` is server-only.** Import it only in Server Components. Never in a file with
   `'use client'`.
5. **Never reintroduce a block/page-builder.** Keep the field-level model.
6. **Tailwind only in `(frontend)`.** Never `@import 'tailwindcss'` in `(payload)` — it
   would break the admin UI.
7. **Never commit** `.env` or `/media`. Secrets and runtime uploads are per-site
   and gitignored. The database is a Railway Postgres service — nothing DB-related
   lives in the repo except `src/migrations/`.
8. **Respect the core / site-specific split** (see below) so template updates merge cleanly.

## Architecture

```
src/
  app/(frontend)/         ← the public site — YOU build these (routes, layout, CSS)
    page.tsx              ← default home page (edit/replace per site)
    layout.tsx, styles.css
  app/(payload)/          ← Payload admin + REST/GraphQL API — GENERATED, do not hand-edit
  content/
    <slug>.ts             ← one editable page = one Payload Global (its fields)
    globals.ts            ← registry of all content groups (payload.config reads this)
    index.tsx             ← CORE helpers: getContent(), <Img>, <Rich>  ← rarely change
  collections/
    Media.ts              ← image/file uploads
    Users.ts              ← admin logins
  payload.config.ts       ← Payload config (Postgres adapter, globals, admin)
scripts/
  setup.mjs               ← `npm run setup` — creates .env with a fresh secret
  seed.ts                 ← `npm run seed` — first admin user + home content
  new-page.mjs            ← `npm run new:page` — scaffolds a page (all 4 steps)
docs/
  NEW-SITE.md             ← START HERE per client: copy the template into your own repo
  DEVELOPING.md           ← day-to-day local dev after the template runs on Railway
  content-fields.md       ← how to add pages & fields (the detailed guide)
  CONTENT.md              ← content model + promoting content staging → prod
  DEPLOY-RAILWAY.md       ← the Railway setup (Postgres + Bucket + vars) and deploys
  MAINTAINING.md          ← running this across many client sites + template fixes
```

**How content flows:** `src/content/<slug>.ts` (fields) → registered in `globals.ts` →
`payload.config.ts` loads them → `npm run generate:types` types them → your page calls
`getContent('<slug>')`.

## Commands

| Command | Doet |
|---------|------|
| `npm run setup` | maak `.env` aan met een unieke `PAYLOAD_SECRET` (nieuwe site) |
| `npm run seed` | eerste admin-gebruiker (uit env) + home-content |
| `npm run dev` | dev-server, site op `:3000`, admin op `/admin` |
| `npm run new:page` | nieuwe bewerkbare pagina toevoegen (interactieve wizard) |
| `npm run migrate:create` | migratie genereren tegen het Postgres-schema (na content-veld-wijziging) — zie [docs/DEPLOY-RAILWAY.md](docs/DEPLOY-RAILWAY.md) |
| `npm run promote` | content kopiëren tussen omgevingen (staging → prod), zonder auth-tabellen — zie [docs/CONTENT.md](docs/CONTENT.md) |
| `npm run generate:types` | Payload-types opnieuw genereren (na content-wijziging) |
| `npm run generate:importmap` | admin import-map herbouwen (na UI-plugin-wijziging) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` / `npm start` | productie-build / -server |

## Adding a page

Preferred: `npm run new:page` (interactive). Manual = 4 steps, fully documented in
[docs/content-fields.md](docs/content-fields.md): define fields → register in
`globals.ts` → `npm run generate:types` → build the route.

The `slug` (in the content group) is what `getContent('slug')` uses; the **route folder
name** under `(frontend)/` is the URL. They may differ (folder `nieuws/` +
`getContent('news')` → `/nieuws`).

## Snel een pagina online (mét tekst) — recept voor agents

Building a page from a design (copy included)? The golden rule:

> **Anything typed/uploaded in the admin lives in the database/Bucket and does NOT travel
> with `git push`. So put the design's copy AND images in CODE — then they ship with the
> push and are live right after the deploy.** Use both (hybrid):
> - **Text, editable by the client** → a field with `defaultValue` = the copy. For richText
>   use the `rich()` helper: `import { rich } from './rich'`.
> - **Fixed layout copy** → write it straight into the route's JSX.
> - **Images** → put the design files in `public/images/`. Render an editable slot as
>   `<Img field={c.heroImage} fallback="/images/hero.jpg" width={1200} height={800} />` —
>   the static file ships in code and shows until someone uploads a replacement in the
>   admin. Purely fixed images: `<Img fallback="/images/x.jpg" .../>` with no `field`, or
>   `next/image` directly.

**Edit files directly** (don't use the interactive `npm run new:page` wizard — it blocks
on prompts). Getting a page online is pure structure + code; no content promotion needed.

1. **Fields** — create `src/content/<slug>.ts` with the design's copy as defaults:
   ```ts
   import { rich } from './rich'
   // ...
   { name: 'heroTitle', type: 'text', defaultValue: 'De kop uit het ontwerp' },
   { name: 'intro', type: 'richText', defaultValue: rich('Alinea 1.', 'Alinea 2.') },
   ```
2. **Register** — add the group to `src/content/globals.ts` (the #1 forgotten step).
3. **Route** — create `src/app/(frontend)/<url>/page.tsx`; read editable bits with
   `getContent('<slug>')` + `<Img>`/`<Rich>` (see the table below), and hardcode fixed
   layout copy directly in the JSX.
4. **Types + migration:**
   ```bash
   npm run generate:types
   npm run migrate:create -- add_<slug>   # against your LOCAL Postgres
   ```
5. **Ship:** commit + push. The deploy runs `payload migrate` → the page is live in every
   environment, with its text (from the code defaults).

Field types + copy-paste examples: [docs/content-fields.md](docs/content-fields.md).
The text-in-code vs admin-content model, and promoting editor content (staging → prod):
[docs/CONTENT.md](docs/CONTENT.md).

## Reading fields in a page

| Field type | Read as |
|------------|---------|
| `text`, `textarea`, `number`, `select`, `checkbox`, `date` | `{c.field}` |
| `richText` | `<Rich field={c.field} />` |
| `upload` (image) | `<Img field={c.field} />` (accepts `width`/`height`/`className`/`priority`) |
| `array` (repeater) | `c.field?.map((row) => ...)` with `key={row.id}` |
| `group` | `c.group.subfield` |

Full field-type reference with examples: [docs/content-fields.md](docs/content-fields.md).

## Gotchas

- **New global not showing / `getContent('x')` errors** → not registered in `globals.ts`,
  or `generate:types` not run.
- **Restart `npm run dev` after adding a global** — the Postgres adapter pushes the new
  table to the dev DB on boot; a running server won't have it yet.
- **You're on the shared dev DB.** `npm run dev` reads/writes the Railway dev Postgres
  (`DATABASE_URI`), not a local file. Schema changes you push are visible to the whole team
  immediately; be deliberate about renaming/removing fields.
- **"You're about to delete … column / DATA LOSS WARNING" prompt on `npm run dev`** → your
  code dropped/renamed a field the dev DB still has. Press **N** unless you truly mean to lose
  that column's data for everyone. Never blindly press `y`.
- **Never `git reset --hard` a customized client site** onto the template — it wipes the
  site's work. Use `merge`/`cherry-pick`. See [docs/MAINTAINING.md](docs/MAINTAINING.md).
- **Image renders empty** → field not filled in `/admin`, or missing `relationTo: 'media'`.

## Core vs site-specific (important for updates)

This template is the **upstream** for many client sites. Keep the boundary clean so
`git merge upstream/main` rarely conflicts:

| Template CORE (comes from upstream — avoid editing per site) | Site-specific (per client — safe to change) |
|---|---|
| `src/content/index.tsx` (helpers) | `src/content/<slug>.ts` (your pages' fields) |
| `scripts/*` | `src/app/(frontend)/**` (routes, layout, CSS) |
| `src/payload.config.ts`, `next.config.ts`, configs | your Tailwind classes / design |
| `src/collections/*` (unless you extend) | `.env` (never committed) |
| `docs/*`, `CLAUDE.md` | |

`src/content/home.ts` and `(frontend)/page.tsx` are template **defaults** that each site
replaces — expect to edit them, and don't be surprised if they conflict on an upstream
merge (keep your version).

See [docs/MAINTAINING.md](docs/MAINTAINING.md) for the full multi-site workflow.
