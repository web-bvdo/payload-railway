# Troubleshooting (deploy & lokaal)

Concrete problemen die we zijn tegengekomen, met de fix.

## Build faalt: `Module not found: @payloadcms/storage-*/client`

De gegenereerde admin-importmap (`src/app/(payload)/admin/importMap.js`) verwijst nog naar
een plugin die je hebt verwijderd of gewisseld.

**Fix:** `npm run generate:importmap`, commit, push. Draai dit **altijd na het toevoegen,
verwijderen of wisselen van een plugin** (storage-adapter, UI-plugin) — anders breekt
`next build` op een ontbrekende module.

## Deploy hangt op *"you've run Payload in dev mode … data loss? (y/N)"*

Dit hoort met `push: false` (sinds die instelling in `payload.config.ts`) **niet meer voor
te komen** — er wordt nergens nog dev-gepusht. Kom je het toch tegen, dan is het een
**legacy** database die ooit met de oude push-modus is aangemaakt: `payload migrate` ziet
dat het schema via dev-push ontstond en vraagt interactief om bevestiging — in een container
kan niemand dat, dus de deploy blijft hangen.

**Fix (staging/wegwerp-data):**
1. Leeg de database:
   ```bash
   psql "<DATABASE_PUBLIC_URL>" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
   ```
2. Redeploy → `payload migrate` bouwt het schema clean op uit de migraties (geen prompt op
   een lege DB).

**Voorkomen:** schema-wijzigingen lopen overal via migraties (`push: false`) — genereer voor
elke veld-wijziging een migratie. Zie [DEVELOPING.md](DEVELOPING.md).

## Runtime: `relation "..." does not exist`

Er is geen migratie, dus `payload migrate` maakte geen schema aan → de tabel bestaat niet.

**Fix:** `npm run migrate:create` (tegen je lokale Postgres) → commit → redeploy. De
template hoort al een initiële migratie te bevatten; genereer een nieuwe na elke
content-veld-wijziging.

## Auto-deploy triggert niet / Settings toont "GitHub Repo not found"

De Railway GitHub-app heeft geen (doorlopende) toegang tot de repo of de org.

**Fix:** geef de app toegang bij het koppelen van de repo (Settings → Source). Een deploy
handmatig triggeren kan via **Settings → Check for updates → Update**, of via het
deployment-menu → **Redeploy**.

## `git push` geweigerd / verkeerde inhoud na een rename of kopie

Heb je meerdere lokale mappen die naar dezelfde repo wijzen (bv. na het hernoemen van een
repo of een `Use this template`-kopie), dan kan een **oude map nog de oude historie**
bevatten. Push daar niet vanuit — dat zet de repo terug.

**Fix:** clone vers (`git clone <url>`) en werk daarin. Een `merge` tussen een
template-kopie en de template werkt niet (*unrelated histories*); gebruik cherry-pick of de
sync-methode uit [MAINTAINING.md](MAINTAINING.md).
