# Deployen naar Railway (SQLite + volume)

Dit is de **eenvoudige** deploy: één service (Next + Payload samen) met een persistente
schijf. Geen aparte database-host, geen object-storage, geen token-gedoe. De app draait op
Railway precies zoals lokaal — SQLite-bestand + `/media` op disk — alleen staan die op een
**Volume** zodat ze redeploys overleven.

> Wil je juist serverless (Vercel)? Dan heb je een read-only filesystem en moet je naar
> hosted libSQL/Turso + Vercel Blob. Zie [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md). Voor
> low-traffic klant-sites is Railway meestal simpeler.

---

## Eenmalig, lokaal

```bash
npm install
npm run setup                 # maakt .env met een unieke PAYLOAD_SECRET
npm run seed                  # eerste admin + home-content (optioneel, voor lokaal testen)
npm run migrate:create        # initiële migratie -> src/migrations/
git add -A && git commit -m "chore: initial migration"
git push
```

De **migratie** is nodig omdat productie het schema niet automatisch aanmaakt (dat doet
alleen `npm run dev`). Draai `npm run migrate:create` opnieuw + commit na elke
content-veld-wijziging.

---

## In Railway

1. **New Project → Deploy from GitHub repo** → kies deze repo. Railway detecteert Next.js
   (Nixpacks) automatisch.
2. **Volume toevoegen:** service → **Variables/Settings → Volumes → New Volume**, mount op
   `/data`. Hierop komen de database én de media te staan (blijft behouden bij redeploys).
3. **Environment Variables** (Settings → Variables):

   | Variable | Waarde |
   |----------|--------|
   | `PAYLOAD_SECRET` | een unieke secret (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`) |
   | `DATABASE_URI` | `file:/data/payload.db` |
   | `MEDIA_DIR` | `/data/media` |

4. **Start-commando:** staat al in `railway.json` (`npm run migrate && npm start`) — die past
   bij elke deploy de migraties toe en start dan de server. Niets in te stellen.
5. **Deploy.** Railway bouwt (`next build`) en start.

---

## Na de eerste deploy

1. Ga naar `https://<jouw-service>.up.railway.app/admin` → **create first user**.
2. Content invullen. Media-uploads landen op het volume (`/data/media`).

## Bestaande dev-content overzetten

Veel simpeler dan bij serverless: er is geen data-conversie nodig. Kopieer je lokale
`payload.db` en `media/` naar het volume (bv. via `railway run` / de Railway CLI, of een
eenmalige upload). Zorg dat de app dan niet tegelijk schrijft.

## Waarom dit eenvoudiger is dan serverless

Op een persistente host verdwijnen de drie serverless-beperkingen:

- **Schijf is schrijfbaar** → SQLite-bestand + `/media` gewoon op het volume. Geen Turso,
  geen Blob.
- **Één langlopend proces** → normale DB-connectie, geen cold-start-gedoe.
- Alleen **migraties** blijven (normale Payload-hygiëne, geen serverless-specifiek gedoe).

Beperking: single-instance schrijven (SQLite doet geen multi-writer). Voor content-sites
prima. Wil je horizontaal schalen, stap dan over op `@payloadcms/db-postgres` + een managed
Postgres (Railway biedt die als los service).
