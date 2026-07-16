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

## 2. Zet een lokale database op

Je vult `DATABASE_URI` in `.env` in — die wijst naar een **lokale** Postgres:

Gebruik een **lokale Postgres**. Het schema wordt **niet** automatisch gepusht:
je database komt op peil via migraties — dezelfde als op productie. Voer bij een
lege database dus eerst `npm run migrate` uit (gebeurt ook automatisch bij boot).

```bash
# met Docker:
docker run --name pg -e POSTGRES_PASSWORD=pw -p 5432:5432 -d postgres:16
```
```
DATABASE_URI=postgresql://postgres:pw@localhost:5432/postgres
```
(Of een via Homebrew geïnstalleerde Postgres:
`DATABASE_URI=postgresql://<jouw-user>@localhost:5432/<db>`.)

> ℹ️ **Lokaal en productie werken nu identiek: schema-wijzigingen gaan altijd via
> migraties** (`push: false` in `src/payload.config.ts`). Dat voorkomt de valkuil
> waarbij dev de kolom zélf toevoegde (*push*), `migrate:create` daardoor een
> **lege** migratie schreef, en productie de kolom nooit kreeg → 500's met
> *`column … does not exist`*.
>
> Wil je met het team dezelfde content zien? Bekijk/bewerk die via de **gedeployde**
> admin op Railway. Verbind je lokaal met een Railway-database, dan geldt: doe eerst
> `npm run migrate`, en push nooit ongemigreerde schema-wijzigingen.

**Media lokaal:** laat de `S3_*`-variabelen leeg → uploads gaan naar `./media`
op schijf. Niks in te stellen.

## 3. Starten

```bash
npm run dev
```

- Site: <http://localhost:3000>
- Admin: <http://localhost:3000/admin>

Eerste keer op je lege lokale database: draai `npm run migrate` (of start
`npm run dev` — pending migraties draaien ook bij boot). De admin vraagt daarna om
een eerste gebruiker (*Create first user*). Snel wat testcontent erin? `npm run seed`
maakt een admin (uit `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env`) + home-content aan.

---

## Het kernidee: alles gaat via migraties (lokaal én productie)

Er is geen *push* meer (`push: false` in `src/payload.config.ts`). Het schema
verandert **alleen** via migratiebestanden in `src/migrations/`, overal hetzelfde:

- **Lokaal én productie** draaien pending migraties bij boot (`prodMigrations`),
  en op productie draait de deploy sowieso `payload migrate`. Verander je een
  veld, dan moet je zelf een migratie genereren (`npm run migrate:create`) en
  toepassen (`npm run migrate`) — anders verandert je database niet.
- **Waarom niet meer pushen?** Met push voegde dev de kolom zélf toe, waardoor
  `migrate:create` tegen een al-bijgewerkte database vergeleek en een **lege**
  migratie schreef. Productie kreeg de kolom dan nooit → 500's. Nu vergelijkt
  `migrate:create` altijd tegen de laatst-gemigreerde stand → echte wijziging =
  echte migratie.

Kortom: **elke veld-wijziging = een migratie**, ook lokaal.

> **Trek je teamgenoten's werk binnen (`git pull`)?** Draai daarna `npm run migrate`
> — nieuwe migraties worden niet meer stilzwijgend gepusht.

---

## Een pagina of veld toevoegen

Volledige uitleg: [content-fields.md](content-fields.md). Snelste weg:

```bash
npm run new:page        # wizard: velden + registratie + route
```

De vaste volgorde na elke veld-wijziging (ook via de wizard, en ook lokaal):

```bash
npm run generate:types            # types bijwerken (anders kloppen je velden niet)
npm run migrate:create -- <naam>  # migratie genereren tegen je database
npm run migrate                   # migratie toepassen op je lokale database
```

Daarna committen en pushen:

```bash
git add src/migrations && git commit -m "chore: migration" && git push
```

> `migrate:create` heeft een Postgres-verbinding nodig (het vergelijkt tegen een
> database). Je bestaande `DATABASE_URI` uit `.env` volstaat.
>
> Krijg je een **lege** migratie terwijl je wél iets wijzigde? Dan is je database
> al vooruit t.o.v. de laatste migratie (bv. ooit gepusht). Reset de lokale
> database of gebruik een schone database, en genereer opnieuw.

## Wat gaat waar heen?

- **Code / opmaak / nieuwe velden** → committen en pushen → Railway deployt.
- **Tekst en afbeeldingen** → invoeren in `/admin`. Lokaal landen die in je
  lokale database (en `./media`); op de gedeployde site in de Railway-Postgres +
  Bucket. Je hoeft daar niks voor te committen.

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

- **`relation "…" does not exist`** of **`column "…" does not exist`** → er is een
  migratie die je database mist. Genereer/pas toe: `npm run migrate:create -- <naam>`
  + `npm run migrate` (lokaal), of commit + push + redeploy (productie).
- **Nieuw veld verschijnt niet** → `npm run generate:types` vergeten, of de
  content-groep niet geregistreerd in `src/content/globals.ts`.
- **Kan niet met de database verbinden** → `DATABASE_URI` klopt niet. Gebruik de
  **public** URL van Railway (niet de interne `…railway.internal`, die werkt
  alleen op Railway zelf).
- **Afbeeldingen komen niet door lokaal** → normaal: lokaal (zonder `S3_*`) gaan
  ze naar `./media`. Beelden die op Railway in de Bucket staan zie je lokaal niet
  tenzij je dezelfde `S3_*`-variabelen in `.env` zet.
```
