# Content: structuur, invoeren en promoveren

Twee soorten "content", met een verschillende levensloop:

| | Wat | Waar het leeft | Hoe het reist |
|---|---|---|---|
| **Structuur** | pagina's, velden (code) | in de repo | via **migraties** → bij elke deploy in álle omgevingen |
| **Content** | tekst, afbeeldingen | in de database + Bucket per omgeving | via **promotie** (los van de deploy) |

Kernregel: **structuur is code en gaat automatisch overal heen; content is data en
verplaats je bewust.** Je synct content niet continu — dat zou overschrijven wat een
editor in productie aanpast.

## Waar voer je content in?

- **Bouwfase:** in de **staging-admin** (`/admin` van je staging-deploy). Beelden landen
  daar meteen in de Bucket — precies waar productie ze ook verwacht.
- **Na livegang:** de klant beheert **productie** zelf via de admin. Geen promotie meer.

> Lokaal voer je alleen wegwerp-testcontent in (je lokale database) — die promoveer je niet.

## Media: deel één Bucket tussen staging en productie

De simpelste opzet: geef staging **en** productie dezelfde `S3_*`-variabelen (dezelfde
Bucket). Dan staan afbeeldingen al gedeeld en hoef je bij een content-promotie **geen
bestanden te kopiëren** — alleen de database-rijen die ernaar verwijzen.

(Wil je ze tóch gescheiden houden, dan moet je bij een promotie de Bucket-inhoud apart
kopiëren, bv. met `aws s3 sync` of `rclone`. Meestal onnodig voor een klantsite.)

## Content promoveren: staging → productie

Eenmalig bij livegang (of wanneer je een verse staging-versie naar prod wilt tillen):

```bash
npm run promote -- --from "<STAGING_DATABASE_PUBLIC_URL>" --to "<PROD_DATABASE_PUBLIC_URL>" --yes
```

- Kopieert **alleen content**; de `users`/auth- en migratie-tabellen op prod blijven staan
  (prod houdt z'n eigen admin + historie).
- Ga je opnieuw promoveren terwijl prod al content heeft? Voeg **`--reset`** toe — dan wordt
  de content op prod eerst geleegd en vervangen:
  ```bash
  npm run promote -- --from "$STAGING_URL" --to "$PROD_URL" --reset --yes
  ```
- De public-URL's haal je uit Railway → Postgres → **Variables → `DATABASE_PUBLIC_URL`**
  (per environment).

> Het script gebruikt `pg_dump | psql` (type-correct). De `pg_dump`-versie moet bij de
> server passen; het script zoekt de juiste of geeft een `brew install postgresql@<major>`-hint.

## Een nieuwe pagina snél online (ook voor AI-agents)

Een pagina "online zetten" = **structuur** toevoegen en deployen. Dat is puur code — geen
content-promotie nodig. Zie het beknopte recept in **[CLAUDE.md](../CLAUDE.md)**
("Snel een pagina online — recept voor agents"). Kort:

1. `src/content/<slug>.ts` (velden, met zinvolle `defaultValue`s zodat de pagina meteen
   iets toont), registreren in `src/content/globals.ts`.
2. Route `src/app/(frontend)/<url>/page.tsx` met `getContent`/`<Img>`/`<Rich>`.
3. `npm run generate:types` → `npm run migrate:create -- add_<slug>` (tegen je lokale Postgres).
4. Commit + push → deploy → pagina live in staging/prod.
5. Tekst/beeld verfijnen editors in de admin.
