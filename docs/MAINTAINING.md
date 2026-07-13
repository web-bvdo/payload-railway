# Onderhoud over meerdere client-sites

Deze template is de **bron** waaruit we per klant een site bouwen. Dit document beschrijft
hoe je een nieuwe site opzet, en — belangrijk — hoe je een bugfix of verbetering aan de
template naar álle bestaande sites krijgt.

## Het model: template (upstream) + fork per klant

```
        payload-template   ← deze repo (de "core", onze bron)
        /      |       \
   klant-a   klant-b   klant-c   ← elk een clone/fork met eigen pagina's + eigen database
```

- **Deze repo** = de gedeelde basis: Payload-config, de content-helpers, scripts, docs.
- **Elke klant-site** = een kopie met eigen content-groepen, routes, styling en database.

De sleutel tot pijnloze updates is de **core/site-specifiek-scheiding** (zie de tabel in
[CLAUDE.md](../CLAUDE.md#core-vs-site-specific-important-for-updates)). Klantwerk zit in
*andere bestanden* dan de core, dus een merge van de template botst zelden.

## Nieuwe klant-site opzetten

```bash
git clone <template-repo-url> klant-x
cd klant-x
git remote rename origin upstream            # template blijft 'upstream'
git remote add origin <nieuwe-repo-van-klant-x>
npm install
npm run setup                                # maakt .env met unieke PAYLOAD_SECRET
# pas ADMIN_EMAIL / ADMIN_PASSWORD aan in .env
npm run seed                                 # admin-gebruiker + home-content
npm run dev                                  # bouwen maar
git push -u origin main
```

Daarna bouw je de site: pagina's toevoegen met `npm run new:page`, routes/styling in
`src/app/(frontend)/`.

## Een fix naar alle sites brengen

1. **Fix in de template** (deze repo), commit, en tag een versie:
   ```bash
   git commit -am "fix: <omschrijving>"
   git tag v1.1.0 && git push --tags
   ```
2. **Per klant-site** de update binnenhalen:
   ```bash
   git fetch upstream
   git merge upstream/main        # of: git merge v1.1.0 voor een specifieke versie
   npm install                    # als dependencies wijzigden
   npm run generate:types
   npm run typecheck && npm run build
   ```
3. Merge-conflicten zijn zeldzaam en zitten normaal alleen in `home.ts` /
   `(frontend)/page.tsx` (de defaults die de klant heeft aangepast) → hou de klant-versie.
   De core-bestanden (`src/content/index.tsx`, `scripts/*`, configs) worden per site
   nauwelijks aangeraakt, dus die mergen schoon.

**Cherry-pick** als je maar één fix wilt zonder de rest: `git cherry-pick <commit>`.

**Sterk afgeweken site?** Als een klant-site ver van de template staat (eigen content-model,
localization, veel eigen pagina's), doe dan **geen** volledige merge — dat geeft een berg
conflicten. Pas alleen de losse infra-wijziging met de hand toe (of cherry-pick die ene
commit). De upstream-merge is voor sites die dicht bij de template blijven.

## ⚠️ NOOIT doen bij een klant-site

Deze twee hebben in de praktijk al bijna data + code gekost:

- **Nooit `git reset --hard upstream/main`** (of `origin/main` van de template) in een
  klant-site. `reset --hard` gooit ál het site-specifieke werk weg en vervangt het door de
  kale template. Gebruik altijd `merge` of `cherry-pick`. `reset --hard` is alleen veilig
  in een lege, verse kopie.
- **Nooit `y` drukken op de "You're about to delete … table / DATA LOSS WARNING"-prompt**
  bij `npm run dev`. Die verschijnt als de **code niet meer bij de database past** (meestal
  omdat de code is teruggezet/veranderd terwijl de database nog de oude content heeft).
  Druk `N`, herstel de bijpassende code (`git reflog` → `git reset --hard <jouw-commit>`),
  en start opnieuw. `y` verwijdert onherstelbaar alle content uit die tabellen.

## Versiebeheer

- Tag elke template-release (`v1.0.0`, `v1.1.0`, …) met [semver](https://semver.org/).
- Noteer per klant-site op welke versie hij zit (bv. in de site-README of een
  `TEMPLATE_VERSION`-bestand), zodat je weet wie welke fixes mist.

## Productie-checklist (cruciaal bij meerdere sites)

Deze dingen MOETEN per site kloppen — ze zijn geen onderdeel van de template zelf omdat ze
per deployment verschillen:

Voor een Vercel-deploy staat het volledige stappenplan in
[docs/DEPLOY-VERCEL.md](DEPLOY-VERCEL.md). In het kort:

- [ ] **Unieke `PAYLOAD_SECRET` per site.** Nooit hergebruiken. Zet 'm in de Vercel
      env-vars (lokaal regelt `npm run setup` dit).
- [ ] **Eigen database per site.** Deel nooit één database tussen klanten.
- [ ] **Productie-database = hosted, niet het SQLite-bestand.** De template draait op de
      `@payloadcms/db-sqlite` adapter; wijs in productie `DATABASE_URI` naar een hosted
      **libSQL/Turso**-database (+ `DATABASE_AUTH_TOKEN`). Zelfde adapter, geen swap nodig.
      (Serverless heeft een read-only filesystem, dus een lokaal `.db`-bestand kan niet.)
- [ ] **Media op cloud-opslag bij serverless.** De `/media`-map overleeft geen serverless
      deploy. Al ingebouwd via **Vercel Blob** (`@payloadcms/storage-vercel-blob`): zet een
      Blob-store aan in Vercel → `BLOB_READ_WRITE_TOKEN` schakelt het automatisch in.
      Alternatief: Cloudflare R2 via `@payloadcms/storage-s3`. VPS met schijf: lokaal mag.
- [ ] **Schema via migrations in productie** (geen dev-autopush). `npm run migrate:create`
      lokaal, committen; `vercel-build` past ze toe bij de deploy.
- [ ] **Admin-wachtwoord gewijzigd** na de eerste login (niet het `.env`-default laten staan).
- [ ] **Backups** van database én media, per site.
- [ ] **Node-versie** volgens `.nvmrc` (`nvm use`).

## Toekomst: core als npm-package

Zodra je veel sites hebt, worden git-merges omslachtig. Dan is de volgende stap: de core
(`src/content/index.tsx`, gedeelde config, scripts) verhuizen naar een privé npm-package
(bv. `@bureauvdo/payload-core`). Sites doen dan `npm update @bureauvdo/payload-core` i.p.v.
mergen. Meer opzetwerk, maar veel schonere updates op schaal. Doen wanneer het aantal sites
(of de merge-pijn) dat rechtvaardigt — nu nog niet nodig.
