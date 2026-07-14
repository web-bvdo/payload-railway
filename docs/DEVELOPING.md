# Lokaal ontwikkelen (nadat de template op Railway draait)

Deze gids gaat over de **dagelijkse ontwikkeling**: je hebt de template al op
Railway staan (Postgres + app + Bucket) en wilt nu lokaal aan de site werken.

> **Werk je nog in de template zelf?** Doe dat niet. Maak eerst per klant een
> eigen kopie-repo — zie [NEW-SITE.md](NEW-SITE.md). Hieronder is "de repo" jouw
> klant-repo, niet de template.

## Hoe het in elkaar zit

| Wat | Waar |
|-----|------|
| **Code** (pagina's, layout, CSS, velddefinities) | in de repo → push → Railway deployt |
| **Database** (tekst-content, relaties) | een **Postgres-service** op Railway |
| **Media** (afbeeldingen) | de **Bucket** (S3) op Railway; lokaal → `./media` |

Lokaal draai je exact dezelfde code, alleen tegen een database + opslag naar
keuze. Je hoeft Railway **niet** na te bootsen — je verbindt er gewoon mee (of
gebruikt een lokale database).

---

## 1. Repo lokaal opzetten (eenmalig)

```bash
git clone https://github.com/<org>/<jouw-repo>.git
cd <jouw-repo>
npm install
npm run setup      # maakt .env aan met een unieke PAYLOAD_SECRET
```

## 2. Kies waar je lokaal je database vandaan haalt

Je moet `DATABASE_URI` in `.env` invullen. Twee manieren:

### Optie A — de Railway dev-database (gedeelde team-data) · *aanbevolen bij een team*

Iedereen werkt op dezelfde data; wat jij invoert zien collega's meteen.

1. Railway → open je **Postgres**-service → tab **Variables** → kopieer
   **`DATABASE_PUBLIC_URL`** (of **Connect → Public Network**).
2. Zet 'm in `.env`:
   ```
   DATABASE_URI=postgresql://postgres:<pw>@<host>.proxy.rlwy.net:<port>/railway
   ```

> Wil je prod-data niet raken tijdens het bouwen? Maak in Railway een aparte
> **`dev`-environment** (eigen Postgres) en gebruik díe public-URL. Zie
> [DEPLOY-RAILWAY.md](DEPLOY-RAILWAY.md).

### Optie B — een lokale Postgres (geïsoleerd) · *aanbevolen solo / voor experimenten*

Niks gedeeld, geen internet nodig, je kunt vrij rommelen met het schema.

```bash
# met Docker:
docker run --name pg -e POSTGRES_PASSWORD=pw -p 5432:5432 -d postgres:16
```
```
DATABASE_URI=postgresql://postgres:pw@localhost:5432/postgres
```
(Of een via Homebrew geïnstalleerde Postgres — dan bv.
`DATABASE_URI=postgresql://<jouw-user>@localhost:5432/<db>`.)

**Media lokaal:** laat de `S3_*`-variabelen leeg → uploads gaan naar `./media`
op schijf. Niks in te stellen.

## 3. Starten

```bash
npm run dev
```

- Site: <http://localhost:3000>
- Admin: <http://localhost:3000/admin>

Eerste keer op een **lege** database: de admin vraagt om een eerste gebruiker
(*Create first user*). Snel wat testcontent erin? `npm run seed` maakt een admin
(uit `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env`) + home-content aan.

Op de **gedeelde** dev-database (optie A) bestaan gebruiker + content meestal al
— dan log je gewoon in.

---

## Het kernidee: `push` (lokaal) vs. migraties (productie)

Dit is waar het meestal verwarrend wordt:

- **Lokaal (`npm run dev`)** synchroniseert Payload het databaseschema
  **automatisch** met je velddefinities (drizzle *push*). Verander je een veld,
  dan past de dev-database zich bij het opslaan/herstarten aan. Geen migratie
  nodig om te kunnen werken.
- **Productie (Railway)** doet dat **niet** automatisch — daar draait bij elke
  deploy `payload migrate`, dat de migratiebestanden in `src/migrations/`
  toepast. Zonder migratie krijgt productie geen schema (en dan foutmeldingen
  als *"relation … does not exist"*).

Kortom: lokaal mag je vrij rommelen; **voor productie leg je wijzigingen vast in
een migratie**.

---

## Een pagina of veld toevoegen

Volledige uitleg: [content-fields.md](content-fields.md). Snelste weg:

```bash
npm run new:page        # wizard: velden + registratie + route in één keer
```

Handmatig een veld wijzigen in `src/content/<slug>.ts`? Doe daarna **altijd**:

```bash
npm run generate:types  # types bijwerken (anders kloppen je velden niet)
```

En vóór je naar productie pusht, als je **content-velden** hebt gewijzigd:

```bash
npm run migrate:create  # genereert een nieuwe migratie tegen het schema
git add src/migrations && git commit -m "chore: migration" && git push
```

> `migrate:create` heeft een Postgres-verbinding nodig (het vergelijkt tegen een
> database). Je bestaande `DATABASE_URI` uit `.env` volstaat.

## Wat gaat waar heen?

- **Code / opmaak / nieuwe velden** → committen en pushen → Railway deployt.
- **Tekst en afbeeldingen** → invoeren in `/admin`. Die leven in de
  Railway-database/Bucket (of, bij optie A, meteen in de gedeelde dev-data).
  Je hoeft daar niks voor te committen.

## Naar productie

```bash
git push
```

Staat auto-deploy aan, dan bouwt Railway vanzelf. Zo niet (zie de
"GitHub Repo not found"-noot in [DEPLOY-RAILWAY.md](DEPLOY-RAILWAY.md)), trigger
'm dan via **Settings → Check for updates → Update** in het Railway-dashboard.
Vergeet bij veld-wijzigingen de migratie niet (zie hierboven).

---

## Veelvoorkomende problemen

- **`relation "…" does not exist`** → het schema staat niet in de database die je
  gebruikt. Lokaal: herstart `npm run dev` (push maakt het aan). Productie:
  migratie ontbreekt → `npm run migrate:create`, commit, push, redeploy.
- **Nieuw veld verschijnt niet** → `npm run generate:types` vergeten, of de
  content-groep niet geregistreerd in `src/content/globals.ts`.
- **Kan niet met de database verbinden** → `DATABASE_URI` klopt niet. Gebruik de
  **public** URL van Railway (niet de interne `…railway.internal`, die werkt
  alleen op Railway zelf).
- **Afbeeldingen komen niet door lokaal** → normaal: lokaal (zonder `S3_*`) gaan
  ze naar `./media`. Beelden die op Railway in de Bucket staan zie je lokaal niet
  tenzij je dezelfde `S3_*`-variabelen in `.env` zet.
```
