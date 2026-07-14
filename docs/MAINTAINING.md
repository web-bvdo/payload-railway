# Onderhoud over meerdere client-sites

Deze template is de **bron** waaruit we per klant een site bouwen. Dit document beschrijft
hoe je een nieuwe site opzet, en — belangrijk — hoe je een bugfix of verbetering aan de
template naar álle bestaande sites krijgt.

## Het model: template (upstream) + fork per klant

```
        payload-template   ← deze repo (de "core", onze bron)
        /      |       \
   klant-a   klant-b   klant-c   ← elk een kopie met eigen pagina's, eigen Postgres + Bucket
```

- **Deze repo** = de gedeelde basis: Payload-config, de content-helpers, scripts, docs.
- **Elke klant-site** = een kopie met eigen content-groepen, routes, styling, database + Bucket.

De sleutel tot pijnloze updates is de **core/site-specifiek-scheiding** (zie de tabel in
[CLAUDE.md](../CLAUDE.md#core-vs-site-specific-important-for-updates)). Klantwerk zit in
*andere bestanden* dan de core, dus een template-fix botst zelden met klantwerk.

## Nieuwe klant-site opzetten

Zie **[NEW-SITE.md](NEW-SITE.md)** — de volledige flow: kopie van de template maken
(`Use this template`), op Railway zetten, Railway op de kopie laten wijzen, lokaal
ontwikkelen. Kort samengevat: je werkt **nooit in deze template**, maar per klant in een
eigen kopie-repo.

## Een template-fix naar alle sites brengen

Omdat elke klant-repo een **kopie** van de template is, haal je fixes op door de template als
extra remote toe te voegen en de losse commit te **cherry-picken** (werkt ook als de repo via
`Use this template` is gemaakt, dus zonder gedeelde git-historie):

1. **Fix in de template** (deze repo), commit, en tag een versie:
   ```bash
   git commit -am "fix: <omschrijving>"
   git tag v1.1.0 && git push --tags
   ```
2. **Per klant-site** de fix binnenhalen:
   ```bash
   git remote add template https://github.com/web-bvdo/payload-railway.git   # eenmalig
   git fetch template
   git cherry-pick <commit-hash>     # de losse fix
   npm install                       # als dependencies wijzigden
   npm run generate:types
   npm run migrate:create            # alleen als de fix content-velden raakt
   npm run typecheck && npm run build
   git push
   ```

> `git merge template/main` kan óók, maar alleen als je de klant-repo ooit met `git clone`
> van de template hebt gemaakt (gedeelde historie). Repo's uit `Use this template` hebben
> een verse historie → een merge geeft *"unrelated histories"*; gebruik dan cherry-pick.
> Conflicten zitten normaal alleen in `home.ts` / `(frontend)/page.tsx` → hou de klant-versie.

**Sterk afgeweken site?** Als een klant-site ver van de template staat (eigen content-model,
localization, veel eigen pagina's), doe dan **geen** volledige merge — dat geeft een berg
conflicten. Pas alleen de losse infra-wijziging met de hand toe (of cherry-pick die ene
commit). De upstream-merge is voor sites die dicht bij de template blijven.

### Een verse kopie in één keer gelijktrekken

Heeft de klant-repo nog **geen eigen werk** (net gemaakt met `Use this template`)? Dan trek
je 'm zo naar de laatste template-staat, zonder per commit te cherry-picken:

```bash
git clone https://github.com/<org>/<klant-repo>.git && cd <klant-repo>   # altijd VERS clonen
git remote add template https://github.com/web-bvdo/payload-railway.git
git fetch template
git checkout template/main -- .    # tree gelijk aan de template
git add -A && git commit -m "chore: sync latest template" && git push
```

⚠️ **Pas op met verouderde lokale checkouts.** Na een repo-rename of een kopie kun je
meerdere mappen hebben die naar dezelfde URL wijzen, waarvan één nog de **oude historie**
bevat. Push daar niet vanuit — dat zet de repo terug. Clone altijd vers voordat je zoiets
doet. (Dit ging in de praktijk al bijna mis.)

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

Het volledige stappenplan staat in [DEPLOY-RAILWAY.md](DEPLOY-RAILWAY.md) en
[NEW-SITE.md](NEW-SITE.md). In het kort, per site:

- [ ] **Eigen Railway-project per site.** Deel nooit database, Bucket of secret tussen klanten.
- [ ] **Unieke `PAYLOAD_SECRET` per site.** De template genereert 'm automatisch bij een
      deploy (`${{secret(48)}}`); lokaal regelt `npm run setup` dit.
- [ ] **Database = de Railway Postgres-service** (`DATABASE_URI = ${{Postgres.DATABASE_URL}}`).
      Eigen Postgres per site.
- [ ] **Media = de Railway Bucket** (S3), gekoppeld via de `S3_*`-vars. Uploads in de admin
      blijven zo bewaard en gedeeld tussen dev/prod.
- [ ] **Schema via migrations in productie** (geen dev-push). `npm run migrate:create`
      lokaal, committen; het start-commando draait `payload migrate` bij elke deploy.
- [ ] **Admin-wachtwoord gewijzigd** na de eerste login (niet het `.env`-default laten staan).
- [ ] **Backups** van de Postgres-database én de Bucket, per site (Railway biedt DB-backups).
- [ ] **Node-versie** volgens `.nvmrc` (`nvm use`).

## Toekomst: core als npm-package

Zodra je veel sites hebt, worden git-merges omslachtig. Dan is de volgende stap: de core
(`src/content/index.tsx`, gedeelde config, scripts) verhuizen naar een privé npm-package
(bv. `@bureauvdo/payload-core`). Sites doen dan `npm update @bureauvdo/payload-core` i.p.v.
mergen. Meer opzetwerk, maar veel schonere updates op schaal. Doen wanneer het aantal sites
(of de merge-pijn) dat rechtvaardigt — nu nog niet nodig.
