# Deployen naar Railway (Postgres + dev/prod)

> **Nieuwe klantsite?** Werk niet in deze template — maak eerst een eigen
> kopie-repo. Zie [NEW-SITE.md](NEW-SITE.md). Deze gids beschrijft de
> Railway-opzet zelf (Postgres/Bucket/vars).

Eén gedeelde Postgres per omgeving. Geen seed, geen export/import, geen
SQLite-bestand. Het model:

- **Database** = een Railway **Postgres-service** (los vlak, eigen connectie).
- **Twee omgevingen** = Railway **environments** `production` en `dev`, elk met
  z'n eigen Postgres.
- **Lokaal** verbind je met de **dev-Postgres** → iedereen in het team werkt op
  dezelfde dev-data. Wat je lokaal invoert staat meteen voor de rest klaar.
- **Media** = een **Bucket** (S3-compatible object-storage). Foto's die in de
  admin geüpload worden landen daar → gedeeld over dev én prod, persistent, geen
  volume nodig. Lokaal (zonder `S3_BUCKET`) vallen uploads terug op `./media`.
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

- **Content-velden veranderd** (`src/content/*`)? → `npm run generate:types` **en**
  `npm run migrate:create`, commit de migratie, push. Railway past 'm toe.
- **Content/afbeeldingen**? → gewoon in de admin invoeren; staat direct in de
  gedeelde database. Geen seed, geen push.
- **Alleen opmaak/routes**? → gewoon pushen.

## Schalen

Postgres kent meerdere schrijvers, dus je kunt de app-service horizontaal
schalen zonder het single-writer-probleem van SQLite. De Postgres-service zelf
schaal je in Railway (plan/resources).
