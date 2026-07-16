# Deployen naar Railway (Postgres + dev/prod)

> **Nieuwe klantsite?** Werk niet in deze template — maak eerst een eigen
> kopie-repo. Zie [NEW-SITE.md](NEW-SITE.md). Deze gids beschrijft de
> Railway-opzet zelf (Postgres/Bucket/vars).

Eén gedeelde Postgres per omgeving. Geen seed, geen export/import, geen
SQLite-bestand. Het model:

- **Database** = een Railway **Postgres-service** (los vlak, eigen connectie).
- **Omgevingen** = Railway **environments** (`production`, evt. `staging`), elk met
  z'n eigen Postgres. Elke omgeving is **migratie-only**: bij de deploy draait
  `payload migrate`.
- **Lokaal** ontwikkel je tegen een **eigen, lokale Postgres** — óók migratie-only
  (`push: false`), net als Railway. Zie [DEVELOPING.md](DEVELOPING.md).
- **Media** = een **Bucket** (S3-compatible object-storage). Foto's die in de
  admin geüpload worden landen daar → persistent, geen volume nodig. Lokaal
  (zonder `S3_BUCKET`) vallen uploads terug op `./media`.
- **Livegaan** = pushen → deploy draait de migraties → schema + code staan live.

> Waarom Postgres i.p.v. SQLite-op-volume? Een losse database-service is
> zichtbaar als eigen vlak, kent meerdere schrijvers (schalen), en heeft nette
> backups. De prijs: een extra service.

> ℹ️ **Schema-wijzigingen gaan overal via migraties** (`push: false`). Verander je
> een veld, dan hoort daar een migratie bij (`npm run migrate:create`), lokaal én
> op Railway — nooit een auto-push. Zie [DEVELOPING.md](DEVELOPING.md).

---

## De Railway-template (dit ís je "setup script")

Je hoeft niks te scripten: een Railway-**template** zet in één klik de
Postgres-service + de app-service neer en koppelt de database automatisch.

**Template maken (eenmalig, in het Railway-dashboard):**

1. Push deze repo naar een **publieke** GitHub-repo (Railway-templates hebben
   een publieke bron nodig).
2. Railway → **Templates → New Template**.
3. Voeg drie services toe op het canvas:
   - **Database → PostgreSQL** (Railway's kant-en-klare Postgres).
   - **Bucket** (S3-compatible object-storage voor de media).
   - **GitHub Repo** → deze repo. Nixpacks detecteert Next.js.
4. Bij de app-service, onder **Variables**, koppel database + bucket:
   - `DATABASE_URI` = `${{Postgres.DATABASE_URL}}`  ← referentie naar de Postgres-service
   - `PAYLOAD_SECRET` = genereer één (zie hieronder). Zet 'm als template-variabele
     zodat elke deploy een eigen secret krijgt.
   - `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` =
     referenties naar de variabelen van de **Bucket**-service (`${{Bucket.…}}`).
     De exacte namen zie je in de Variables-tab van de Bucket.
5. **Publish**. Iedereen die de template deployt krijgt Postgres + Bucket + app,
   automatisch gekoppeld.

Het start-commando (`npm run migrate && npm start`) staat in `railway.json` —
niks in te stellen.

## Een staging-omgeving (optioneel)

Een template-deploy geeft je één omgeving (`production`). Wil je een test-omgeving:

1. Project → **Environments → New Environment** → `staging`. Railway **fork**t de
   services, dus `staging` krijgt z'n **eigen** Postgres + Bucket + app.
2. Zo heb je twee gescheiden, migratie-beheerde deploys: staging- en prod-data
   lopen niet door elkaar.

Beide omgevingen draaien `payload migrate` bij de deploy — verbind er dus **niet**
lokaal mee (zie de waarschuwing bovenaan).

## Lokaal ontwikkelen

Draai lokaal tegen een **eigen lokale Postgres**, niet tegen Railway. De volledige
workflow (database opzetten, velden toevoegen, migraties) staat in
**[DEVELOPING.md](DEVELOPING.md)**.

## Migraties (nodig voor productie)

Schema-wijzigingen gaan **overal** via migraties (`push: false`) — geen auto-push,
lokaal noch op Railway. Na elke content-veld-wijziging:

```bash
npm run migrate:create -- <naam>   # genereert src/migrations/ tegen je Postgres-schema
npm run migrate                    # past 'm toe op je lokale database
git add src/migrations && git commit -m "chore: migration" && git push
```

Railway draait `npm run migrate` bij elke deploy (staat in het start-commando),
dus prod krijgt de migratie automatisch.

> De template-repo bevat al een initiële migratie. Genereer een nieuwe met
> `npm run migrate:create` (tegen je lokale Postgres) telkens als je
> content-velden wijzigt, en commit 'm.

## Environment variables (per app-service)

| Variable | Waarde |
|----------|--------|
| `DATABASE_URI` | `${{Postgres.DATABASE_URL}}` (referentie naar de Postgres-service) |
| `PAYLOAD_SECRET` | unieke secret (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`) |
| `S3_BUCKET` / `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | referenties naar de **Bucket**-service (`${{Bucket.…}}`) |
| `S3_REGION` | `auto` (optioneel; default is `auto`) |

## Media (en waarom database + opslag los staan)

Drie soorten data, drie plekken — bewust gescheiden:

- **Tekst / content** (pagina's, velden, relaties) → de **Postgres-service**. Eigen
  persistente opslag; content-wijzigingen in de admin overleven elke redeploy.
- **Afbeeldingen** → de **Bucket** (S3-compatible). Uploads via de admin landen
  daar en zijn gedeeld over dev én prod. De `s3Storage`-plugin in
  `payload.config.ts` regelt dit; hij is actief zodra `S3_BUCKET` gezet is.
- **Lokaal** (zonder `S3_BUCKET`) → uploads vallen terug op `./media` op schijf,
  handig voor snel lokaal testen.

Waarom niet op een volume of in de repo? Een volume hangt per environment (niet
gedeeld), en repo-media botst met de map waaruit Payload serveert. Een bucket
heeft dat probleem niet: één opslag, overal dezelfde URL's, geen redeploy-verlies.

> **Draait 'ie? Dan verder ontwikkelen:** hoe je lokaal aan de site werkt staat
> in [DEVELOPING.md](DEVELOPING.md).

## Bij latere wijzigingen

- **Content-velden veranderd** (`src/content/*`)? → `npm run generate:types`,
  `npm run migrate:create -- <naam>`, `npm run migrate` (lokaal), commit de
  migratie, push. Railway past 'm toe.
- **Content/afbeeldingen**? → gewoon in de admin invoeren; staat direct in de
  gedeelde database. Geen seed, geen push.
- **Alleen opmaak/routes**? → gewoon pushen.

## Schalen

Postgres kent meerdere schrijvers, dus je kunt de app-service horizontaal
schalen zonder het single-writer-probleem van SQLite. De Postgres-service zelf
schaal je in Railway (plan/resources).
