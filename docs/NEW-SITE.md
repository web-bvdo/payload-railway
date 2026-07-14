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

## Stap 3 — Ontwikkel lokaal in de klant-repo

```bash
git clone https://github.com/web-bvdo/klant-x.git
cd klant-x
npm install
npm run setup      # maakt .env + PAYLOAD_SECRET
# DATABASE_URI = de public Postgres-URL van Railway (zie DEVELOPING.md)
npm run dev        # → localhost:3000, admin op /admin
```

Volledige dagelijkse workflow (database kiezen, velden toevoegen, migraties,
naar productie): **[DEVELOPING.md](DEVELOPING.md)**.

---

## Template-updates later doorvoeren (optioneel)

Fix je iets in de **template** dat ook naar bestaande klantsites moet? Omdat elke
klant-repo van de template is afgeleid, kun je de template als extra remote
toevoegen en wijzigingen cherry-picken/mergen:

```bash
git remote add template https://github.com/web-bvdo/payload-railway.git
git fetch template
git cherry-pick <commit>     # of: git merge template/main  (let op conflicten)
```

Doe dit per klant-repo — nooit andersom (klantwerk hoort niet in de template).
Zie ook [MAINTAINING.md](MAINTAINING.md).
