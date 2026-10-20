# Een nieuwe klantsite starten (zónder de template te wijzigen)

**Lees dit eerst.** Deze repo is de **template** (blauwdruk) voor al je
klantsites. Je ontwikkelt hier **nooit** rechtstreeks in. Per klant maak je één
keer een **eigen kopie-repo** en daarin werk je.

## Het model

| | |
|---|---|
| **Template-repo** (deze) | de blauwdruk. Nooit per klant aanpassen. → `web-bvdo/payload-railway` |
| **Klant-repo** | een kopie die je één keer maakt. **Hierin ontwikkel je.** → bv. `web-bvdo/klant-x` |
| **Railway-project** | deployt de **klant-repo** (niet de template) |
| **fleet** | register van alle sites + template-updates in bulk → `web-bvdo/fleet` |

Waarom? De template is de upstream voor ál je sites. Wijzig je 'm per klant, dan
lopen bugfixes en updates door elkaar. Eén blauwdruk, veel losse kopieën.

---

## Stap 1 — Maak een kopie-repo van de template

Kies één:

- **GitHub UI:** open `github.com/web-bvdo/payload-railway` → knop
  **Use this template → Create a new repository** → naam bv. `klant-x`.
- **CLI:**
  ```bash
  gh repo create web-bvdo/klant-x --private --template web-bvdo/payload-railway --clone
  ```

Je hebt nu een zelfstandige repo met alle template-code. De template blijft
ongemoeid.

## Stap 2 — Zet 'm op Railway

Snelste route (behoudt de automatische koppeling van Postgres + Bucket + vars):

1. **Deploy de template** één keer via de deploy-link (zie
   [DEPLOY-RAILWAY.md](DEPLOY-RAILWAY.md)). Railway zet Postgres + Bucket + app
   neer, al gekoppeld.
2. Ga in het project naar de app-service → **Settings → Source**:
   - Klik **Eject** (bij *Upstream Repo*) → maakt de service los van de template;
     je krijgt geen "template update"-meldingen meer en de service is van jou.
   - Bij **Source Repo**: **Disconnect** de template-repo en verbind **`klant-x`**.
3. Vanaf nu: elke push naar `klant-x` → Railway deployt. De template raak je
   nooit meer aan.

> Auto-deploy-op-push werkt pas als de Railway GitHub-app toegang heeft tot
> `klant-x`. Geef die toegang bij het verbinden; anders trigger je een deploy via
> **Settings → Check for updates → Update**.

4. **Start-commando en healthcheck** (start `npm run migrate && npm start`,
   healthcheck op `/`, timeout 600 s). Die zet de Railway-template niet; ze komen uit
   `.railway/railway.ts` in de klant-repo. Na het omzetten van de bron, in `klant-x`
   gekoppeld met `railway link`:

   ```bash
   node scripts/railway-iac.mjs && railway config plan && railway config apply
   ```

   Commit daarna `.railway/`. Zonder deze stap start de site zonder migraties. Zie
   [DEPLOY-RAILWAY.md](DEPLOY-RAILWAY.md#start-commando-en-healthcheck).

## Stap 3 — Ontwikkel lokaal in de klant-repo

```bash
git clone https://github.com/web-bvdo/klant-x.git
cd klant-x
npm install
npm run setup      # maakt .env + PAYLOAD_SECRET
# DATABASE_URI = de public Postgres-URL van Railway (zie DEVELOPING.md)
npm run migrate
npm run seed
npm run dev        # → localhost:3000, admin op /admin
```

Volledige dagelijkse workflow (database kiezen, velden toevoegen, migraties,
naar productie): **[DEVELOPING.md](DEVELOPING.md)**.

## Stap 4 — Registreer de site in fleet

[web-bvdo/fleet](https://github.com/web-bvdo/fleet) is het register van alle sites.
Zonder dit blok krijgt de site geen template-updates (`fleet sync`) en staat hij
niet in de wekelijkse status. Voeg aan `sites.json` toe:

```json
{
  "name": "klant-x",
  "repo": "web-bvdo/klant-x",
  "url": "https://<service>.up.railway.app",
  "railway": { "project": "<id>", "service": "<id>", "environment": "<id>" },
  "templateBase": "<sha>",
  "since": "2026-10-15"
}
```

- `railway`: de id's van project, app-service en environment (Railway-dashboard →
  Settings, of via de Railway-MCP).
- `templateBase`: de template-commit waarvan de site gemaakt is. Direct bij het
  aanmaken ophalen, vóór de template weer verandert:
  ```bash
  gh api repos/web-bvdo/payload-railway/commits/main -q .sha
  ```

Commit + push in de fleet-repo. De eerste `./fleet sync` zet daarna `.template-sha`
in de site-repo.

---

## Template-updates later doorvoeren

Fix je iets in de **template** dat ook naar bestaande klantsites moet? Dat doet
`./fleet sync` in de fleet-repo: het cherry-pickt de nieuwe template-commits in
elke geregistreerde site en opent per site een PR die de CI zelf merget bij groen.
Nooit andersom (klantwerk hoort niet in de template). Zie
[MAINTAINING.md](MAINTAINING.md).
