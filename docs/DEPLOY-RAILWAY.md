# Deployen naar Railway (SQLite + volume)

De **eenvoudige** deploy: één service (Next + Payload samen). Geen externe database-host,
geen object-storage, geen token-gedoe. De opzet:

- **Media** = onderdeel van de repo (`/media`, gewoon meegecommit) → shipt met elke deploy.
- **Database** = een SQLite-bestand op een **Volume** (Payload schrijft er continu naar, dus
  het moet persistent zijn).
- **Content** = één keer geseed via `seed/content.json`, daarna is de productie-database
  leidend.

> Wil je juist serverless (Vercel)? Dan heb je een read-only filesystem en moet je naar
> hosted libSQL/Turso + Vercel Blob — zie [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md). Voor
> low-traffic klant-sites is Railway meestal simpeler.

---

## Hoe data-export/import werkt (het belangrijkste stuk)

SQLite is één bestand, maar dat bestand kun je **niet** in git zetten: het bevat de
`users`-tabel met admin-mailadressen en wachtwoord-hashes. Daarom splitsen we het in twee
stukken die wél veilig de repo in kunnen:

| Onderdeel | Waar | In git? |
|-----------|------|---------|
| Afbeeldingen | `/media` | **ja** — publieke assets, geen secrets |
| Content (tekst, pagina's, relaties) | `seed/content.json` | **ja** — via `npm run export:seed`, zónder de users-tabel |
| Admin-users, sessies, wachtwoorden | `payload.db` | **nooit** — verse admin in productie |

### Export (lokaal — content vastleggen in de repo)

```bash
npm run export:seed          # schrijft seed/content.json uit payload.db (zonder users)
git add seed/content.json media
git commit -m "content: update seed"
git push
```

### Import (automatisch — op Railway bij de start)

Het start-commando in `railway.json` is:

```
npm run migrate && node scripts/import-seed.mjs && npm start
```

Bij de **eerste** deploy:
1. `payload migrate` maakt het schema aan in `/data/payload.db` (leeg volume).
2. `import-seed.mjs` laadt `seed/content.json` erin — met gebonden parameters (geen
   `unistr`-encoding-probleem) en uitgestelde FK-checks (insert-volgorde maakt niet uit).
3. De server start.

Bij **latere** deploys ziet `import-seed.mjs` dat er al content is en **slaat het over** —
je productie-bewerkingen worden dus nooit overschreven. De productie-database is vanaf dan
leidend; de seed is alleen de eerste vulling.

---

## Eenmalig, lokaal

```bash
npm install
npm run setup                 # .env met unieke PAYLOAD_SECRET
npm run seed                  # eerste admin + home-content (voor lokaal bouwen/testen)
npm run migrate:create        # initiële migratie -> src/migrations/
npm run export:seed           # content -> seed/content.json
git add -A && git commit -m "chore: railway migration + seed" && git push
```

De **migratie** is nodig omdat productie het schema niet automatisch aanmaakt (dat doet
alleen `npm run dev`). Draai `npm run migrate:create` opnieuw + commit na elke
content-veld-wijziging.

## In Railway

1. **New Project → Deploy from GitHub repo** → deze repo. Nixpacks detecteert Next.js.
2. **Volume** toevoegen, mount op **`/data`** (hier komt alleen de database).
3. **Environment Variables:**

   | Variable | Waarde |
   |----------|--------|
   | `PAYLOAD_SECRET` | een unieke secret (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`) |
   | `DATABASE_URI` | `file:/data/payload.db` |

   > **Geen** `MEDIA_DIR` zetten: media komt uit `./media` in de repo. (Wil je dat editors
   > in productie zélf afbeeldingen uploaden en dat die blijven bestaan, zet dan
   > `MEDIA_DIR=/data/media`, voeg `/media` toe aan `.gitignore`, en kopieer je media één
   > keer naar het volume — anders shipt de repo-versie er bij elke deploy overheen.)

4. **Deploy.** Start-commando staat in `railway.json` — niks in te stellen.
5. `https://<service>.up.railway.app/admin` → **create first user** → klaar, content + foto's
   staan er.

## Bij latere wijzigingen

- **Content-velden veranderd** (`src/content/*`)? → `npm run generate:types` **en**
  `npm run migrate:create`, commit de nieuwe migratie, push. Railway past 'm bij de deploy toe.
- **Nieuwe/andere content of afbeeldingen** die je vanuit lokaal wilt meenemen? →
  `npm run export:seed` + `git add media seed/content.json`, commit, push. (Let op:
  `import-seed` seedt alleen als productie nog leeg is; bestaande prod-content blijft staan.)
- **Alleen opmaak/routes**? → gewoon pushen.

---

## Waarom dit eenvoudiger is dan serverless

Op een persistente host verdwijnen de serverless-beperkingen: schrijfbare schijf (SQLite +
media gewoon op disk), één langlopend proces (normale DB-connectie), en de enige "dans" die
overblijft is deze eenmalige content-seed. Geen hosted libSQL/Turso, geen Blob-store, geen
token-die-de-store-bepaalt.

Beperking: single-instance schrijven (SQLite kent geen meerdere schrijvers). Voor
content-sites prima. Wil je horizontaal schalen, stap dan over op `@payloadcms/db-postgres`
+ een managed Postgres (Railway biedt die als los service).
