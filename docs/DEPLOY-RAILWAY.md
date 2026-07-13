# Deployen naar Railway (Postgres + dev/prod)

Eén gedeelde Postgres per omgeving. Geen seed, geen export/import, geen
SQLite-bestand. Het model:

- **Database** = een Railway **Postgres-service** (los vlak, eigen connectie).
- **Twee omgevingen** = Railway **environments** `production` en `dev`, elk met
  z'n eigen Postgres.
- **Lokaal** verbind je met de **dev-Postgres** → iedereen in het team werkt op
  dezelfde dev-data. Wat je lokaal invoert staat meteen voor de rest klaar.
- **Media** = de `./media`-map in de repo (gewoon meegecommit) shipt met elke
  deploy. Wil je dat editors óók in de admin foto's uploaden en die blijven
  staan, dan zet je een **volume** op `/data/media` (`MEDIA_DIR`) — anders zijn
  prod-uploads na een redeploy weg.
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

## Media (en waarom de database los staat)

Twee dingen die vaak door elkaar lopen:

- **Tekst / content** (pagina's, velden, relaties) → de **Postgres-service**. Die
  heeft z'n eigen persistente opslag; content-wijzigingen in de admin overleven
  elke redeploy **zonder** volume. De database is dus niet een bestand op een
  volume — het is de losse Postgres-service.
- **Afbeeldingen** → bestanden op schijf. Twee manieren:
  1. **In de repo** (`./media`, meegecommit) — de baseline. Foto's die devs
     toevoegen shippen met de deploy. Simpel, geen volume nodig.
  2. **Op een volume** (`MEDIA_DIR=/data/media` + volume op `/data`) — nodig als
     **editors in de productie-admin** uploaden en die moeten blijven staan.
     Zonder volume liggen die uploads op Railway's tijdelijke schijf en zijn ze
     na de volgende redeploy weg.

De template zet het volume standaard klaar (stap 5), zodat admin-uploads meteen
persistent zijn. Upload je alleen als dev via de repo, dan kun je het volume
weglaten.

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
