# Deployen naar Vercel

De template draait lokaal op een SQLite-bestand + media op schijf. Dat werkt **niet** op
Vercel (serverless = read-only, tijdelijke filesystem). Deze template is al voorbereid op:

- **Database:** hosted **libSQL/Turso** (dezelfde `@payloadcms/db-sqlite` adapter, maar met
  een remote URL + auth-token).
- **Media:** **Vercel Blob** (`@payloadcms/storage-vercel-blob`) — lokaal automatisch uit,
  op Vercel aan zodra de token er is.
- **Schema:** via **migrations** (geen dev-autopush in productie).

> `npm run setup` en `npm run seed` zijn **lokale** tools. Op Vercel zet je env-vars in het
> dashboard, en de eerste admin maak je via het `/admin`-scherm.

---

## Eenmalig, vóór de eerste deploy

### 1. Database aanmaken (Turso)

```bash
# installeer de Turso CLI (eenmalig op je machine): https://docs.turso.tech
turso db create <klant-naam>
turso db show <klant-naam> --url        # → DATABASE_URI (libsql://...)
turso db tokens create <klant-naam>     # → DATABASE_AUTH_TOKEN
```

Eén database per klant-site — nooit delen.

### 2. Initiële migratie genereren en committen

Productie maakt het schema aan via migrations, niet via autopush. Genereer ze één keer
(en opnieuw na elke content-veld-wijziging):

```bash
npm run migrate:create        # maakt bestanden in src/migrations/
git add src/migrations && git commit -m "chore: initial migration"
git push
```

### 3. Payload-secret genereren

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Bewaar de output voor stap 5.

---

## In het Vercel-dashboard

### 4. Project importeren

- Import het GitHub-repo. Preset: **Next.js**. Root Directory: `./`.
- **Build & Output Settings:** laat alles op de default (toggles UIT). Vercel detecteert
  automatisch het `vercel-build`-script uit `package.json` — dat draait
  `payload migrate && next build`, dus je schema wordt bij elke deploy bijgewerkt.

### 5. Environment Variables (vervangt `npm run setup`)

Voeg toe onder Settings → Environment Variables (voor Production, en desgewenst Preview):

| Variable | Waarde |
|----------|--------|
| `PAYLOAD_SECRET` | de gegenereerde secret uit stap 3 (uniek per site) |
| `DATABASE_URI` | de Turso-URL uit stap 1 (`libsql://...`) |
| `DATABASE_AUTH_TOKEN` | het Turso-token uit stap 1 |

> Zet deze **vóór** de eerste deploy — `vercel-build` heeft ze nodig om de migratie tegen
> de database te draaien.
>
> **Gebruik je de Vercel Turso-integratie** (Storage → Turso) i.p.v. handmatig? Die injecteert
> zelf `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` en beheert/roteert het token. De config leest
> die namen ook, dus dan sla je `DATABASE_URI` + `DATABASE_AUTH_TOKEN` over. Zet ze niet
> alletwee: een losse `DATABASE_URI` heeft voorrang en overschaduwt de integratie.

### 6. Vercel Blob koppelen (media)

- Vercel-dashboard → **Storage** → **Create → Blob** → koppel aan dit project.
- Dat injecteert automatisch `BLOB_READ_WRITE_TOKEN` in je env-vars. Zodra die aanwezig is,
  schakelt de config uploads over naar Blob (zie `src/payload.config.ts`).

### 7. Deploy

Deploy (of push naar `main`). `vercel-build` draait de migraties en bouwt de site.

---

## Na de eerste deploy

1. Ga naar `https://<jouw-site>/admin`. Payload toont een **"create first user"**-scherm
   (zolang er nog geen gebruiker is) → maak hier de admin aan.
2. Vul de content in. Klaar.

## Bestaande dev-content naar productie

Heb je lokaal al content + afbeeldingen ingevuld (in `payload.db` + `/media`) en wil je
die niet met de hand overtypen in de productie-`/admin`? Zet ze één keer over met
`npm run migrate:content` (script: `scripts/migrate-to-prod.mjs`).

**Doe dit vóórdat je content invult in de productie-`/admin`** — anders botsen de rijen.
Voorwaarde: de eerste deploy heeft gedraaid, dus het schema staat al in de Turso-DB (via
`payload migrate`).

### 1. Turso-URL + token ophalen

De Vercel-Turso-integratie maakt de DB aan in een **eigen org** (`vercel-icfg-…`), niet in
je persoonlijke Turso-account. Schakel ernaartoe:

```bash
turso org list                       # zoek de vercel-icfg-… org
turso org switch <vercel-icfg-org>
turso db list                        # toont de DB-naam
export TURSO_DATABASE_URL=$(turso db show <db-naam> --url)
export TURSO_AUTH_TOKEN=$(turso db tokens create <db-naam>)
```

### 2. Blob-token ophalen

De `BLOB_READ_WRITE_TOKEN` van je **public** Blob-store (zie de valkuil hieronder):

```bash
export BLOB_READ_WRITE_TOKEN="vercel_blob_rw_…"
```

### 3. Overzetten

```bash
npm run migrate:content
```

Dit kopieert alle content-rijen naar Turso en uploadt `/media` naar Blob. Het script is
her-runbaar (`INSERT OR REPLACE` + `allowOverwrite`) en slaat auth/systeem-tabellen over,
zodat je productie-admin, migratie-state en admin-prefs intact blijven.

### Valkuilen (waarom het script doet wat het doet)

- **`no such function: unistr`** bij een gewone `sqlite3 .dump | turso db shell`: de
  SQLite-dump codeert speciale tekens met `unistr()`, wat libSQL/Turso niet kent. Het
  script omzeilt dit door rijen met **gebonden parameters** te schrijven i.p.v. SQL-tekst.
- **`FOREIGN KEY constraint failed`**: Turso dwingt FK's af. Het script draait alles in één
  transactie met `PRAGMA defer_foreign_keys=ON`, zodat de insert-volgorde niet uitmaakt.
- **Media-URL = token → store.** De Blob-adapter leidt de store volledig af uit
  `BLOB_READ_WRITE_TOKEN` (`vercel_blob_rw_<storeId>_…`) en bouwt elke URL als
  `https://<storeId>.public.blob.vercel-storage.com/<filename>`. Gevolg:
  - De store moet **public** zijn — de adapter uploadt met `access:'public'`. Een private
    store weigert dat (en breekt óók je admin-uploads). Maak/gebruik een public store.
  - Dezelfde token moet in de **productie-env** staan als `BLOB_READ_WRITE_TOKEN`. Staat er
    een token van een andere/oude store, dan wijzen alle media-URLs naar de verkeerde
    (lege) store → gebroken beelden. Zorg voor **precies één** `BLOB_READ_WRITE_TOKEN` in
    productie en **redeploy** na een wijziging (env-vars gelden pas na een nieuwe build).
- **Draai het script vanuit de projectmap**, niet vanuit een losse temp-locatie — het
  importeert `@libsql/client` en `@vercel/blob` uit de `node_modules` van het project.

## Bij latere wijzigingen

- **Content-velden veranderd** (`src/content/*`)? → `npm run generate:types` **en**
  `npm run migrate:create`, commit de nieuwe migratie, push. Vercel past 'm bij de deploy toe.
- **Alleen pagina's/opmaak** (geen velden)? → gewoon pushen, geen migratie nodig.

## Alternatieven

- **Media goedkoper bij veel verkeer:** Cloudflare R2 (geen egress-kosten) i.p.v. Vercel
  Blob. Gebruik dan `@payloadcms/storage-s3` met een R2-endpoint. Vercel Blob is het
  eenvoudigst omdat het native in Vercel zit.
- **Klassieke VPS i.p.v. serverless:** dan mag SQLite-bestand + lokale `/media` blijven
  (persistente schijf). Dan heb je Turso/Blob niet nodig.
