# Deployen naar Railway (Postgres + dev/prod)

Eén gedeelde Postgres per omgeving. Geen seed, geen export/import, geen
SQLite-bestand. Het model:

- **Database** = een Railway **Postgres-service** (los vlak, eigen connectie).
- **Twee omgevingen** = Railway **environments** `production` en `dev`, elk met
  z'n eigen Postgres.
- **Lokaal** verbind je met de **dev-Postgres** → iedereen in het team werkt op
  dezelfde dev-data. Wat je lokaal invoert staat meteen voor de rest klaar.
- **Livegaan** = `dev` → `production` promoten (of prod los vullen). Geen
  dubbel werk.

> Waarom Postgres i.p.v. SQLite-op-volume? Een losse database-service is
> zichtbaar als eigen vlak, kent meerdere schrijvers (team + schalen), en laat
> je lokaal op de gedeelde dev-data werken. De prijs: een extra service.

---

## De Railway-template (dit ís je "setup script")

Je hoeft niks te scripten: een Railway-**template** zet in één klik de
Postgres-service + de app-service neer en koppelt de database automatisch.

**Template maken (eenmalig, in het Railway-dashboard):**

1. Push deze repo naar een **publieke** GitHub-repo (Railway-templates hebben
   een publieke bron nodig).
2. Railway → **Templates → New Template**.
3. Voeg twee services toe op het canvas:
   - **Database → PostgreSQL** (Railway's kant-en-klare Postgres).
   - **GitHub Repo** → deze repo. Nixpacks detecteert Next.js.
4. Bij de app-service, onder **Variables**, koppel de database:
   - `DATABASE_URI` = `${{Postgres.DATABASE_URL}}`  ← referentie naar de andere service
   - `PAYLOAD_SECRET` = genereer één (zie hieronder). Zet 'm als template-variabele
     zodat elke deploy een eigen secret krijgt.
   - `MEDIA_DIR` = `/data/media`
5. Voeg bij de app-service een **Volume** toe, mount op **`/data`** (voor de
   media-uploads).
6. **Publish**. Iedereen die de template deployt krijgt Postgres + app,
   automatisch gekoppeld.

Het start-commando (`npm run migrate && npm start`) staat in `railway.json` —
niks in te stellen.

## dev + prod omgevingen

Een template-deploy geeft je één omgeving (`production`). De tweede omgeving
voeg je in het project toe:

1. Project → **Environments → New Environment** → `dev`. Railway **fork**t de
   services, dus `dev` krijgt z'n **eigen** Postgres + app.
2. Zo heb je twee gescheiden databases: prod-data en dev-data lopen niet door
   elkaar.

## Lokaal op de dev-database

1. Open in Railway de **dev**-Postgres → **Connect → Public Network** → kopieer
   de connection string (`postgresql://…@…proxy.rlwy.net:<port>/railway`).
2. Zet die in je lokale `.env` als `DATABASE_URI` (zie `.env.example`).
3. `npm run setup` (genereert `PAYLOAD_SECRET`), vul `DATABASE_URI` in.
4. `npm run dev` → je draait lokaal, maar leest/schrijft de gedeelde dev-DB.

Meerdere developers zetten dezelfde dev-string in hun `.env` → allemaal dezelfde
data. Geen seed nodig.

> **Schema-wijzigingen.** In dev pusht de Postgres-adapter je veld-wijzigingen
> automatisch naar de dev-DB. ponytail: bij één gedeelde dev-DB betekent dat een
> kleine race als twéé mensen tegelijk velden wijzigen — voor kleine teams prima.
> Voor productie maak je een migratie (zie onder).

## Migraties (nodig voor productie)

Productie pusht schema **niet** automatisch — daar draaien migraties. Eenmalig,
en opnieuw na elke content-veld-wijziging:

```bash
npm run migrate:create        # genereert src/migrations/ tegen je Postgres-schema
git add src/migrations && git commit -m "chore: migration" && git push
```

Railway draait `npm run migrate` bij elke deploy (staat in het start-commando),
dus prod krijgt het schema automatisch.

> De template-repo bevat nog **geen** migratie — die genereer je één keer zodra
> je lokaal met de dev-Postgres verbonden bent, en commit je.

## Environment variables (per app-service)

| Variable | Waarde |
|----------|--------|
| `DATABASE_URI` | `${{Postgres.DATABASE_URL}}` (referentie naar de Postgres-service) |
| `PAYLOAD_SECRET` | unieke secret (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`) |
| `MEDIA_DIR` | `/data/media` (het gemounte volume) |

## Media

Uploads gaan naar het volume onder `MEDIA_DIR`. Let op: een volume hangt **per
environment** (en per instance). Een afbeelding die je lokaal upload landt op je
eigen schijf; de dev-DB-rij verwijst ernaar maar een teamlid ziet 'm pas als het
bestand er ook staat.

- **Enkele prod-instance, weinig uploads** → volume is prima.
- **Team-brede media-sync** → zet een S3-compatible store bij
  (`@payloadcms/storage-s3` → Railway bucket / Cloudflare R2). Dan lopen ook de
  bestanden synchroon met de gedeelde database.

## Bij latere wijzigingen

- **Content-velden veranderd** (`src/content/*`)? → `npm run generate:types` **en**
  `npm run migrate:create`, commit de migratie, push. Railway past 'm toe.
- **Content/afbeeldingen**? → gewoon in de admin invoeren; staat direct in de
  gedeelde database. Geen seed, geen push.
- **Alleen opmaak/routes**? → gewoon pushen.

## Schalen

Postgres kent meerdere schrijvers, dus je kunt de app-service horizontaal
schalen zonder het single-writer-probleem van SQLite. De Postgres-service zelf
schaal je in Railway (plan/resources).
