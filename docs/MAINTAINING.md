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
- **[web-bvdo/fleet](https://github.com/web-bvdo/fleet)** = de laag erboven: `sites.json` als
  register van alle sites, en het `fleet`-script voor status en bulk-acties (`sync`, `run`).

De sleutel tot pijnloze updates is de **core/site-specifiek-scheiding** (zie de tabel in
[CLAUDE.md](../CLAUDE.md#core-vs-site-specific-important-for-updates)). Klantwerk zit in
*andere bestanden* dan de core, dus een template-fix botst zelden met klantwerk.

## Nieuwe klant-site opzetten

Zie **[NEW-SITE.md](NEW-SITE.md)** — de volledige flow: kopie van de template maken
(`Use this template`), op Railway zetten, Railway op de kopie laten wijzen, registreren in
`sites.json` van fleet, lokaal ontwikkelen. Kort samengevat: je werkt **nooit in deze
template**, maar per klant in een eigen kopie-repo.

## Een template-fix naar alle sites brengen

Elke klant-repo is een **kopie** van de template zonder gedeelde git-historie, dus fixes gaan
per commit (cherry-pick). Dat doet `fleet sync` voor alle sites tegelijk:

1. **Fix in de template** (deze repo): PR, groene CI, mergen naar `main`.
2. **In de fleet-repo:**
   ```bash
   ./fleet sync                 # alle sites, PR per site
   ./fleet sync -o klant-a      # alleen deze site(s), kommagescheiden
   ```

Per site leest `sync` `.template-sha` uit de site-repo (de laatste template-commit die de site
heeft; zolang dat bestand er nog niet is `templateBase` uit `sites.json`), cherry-pickt in een
verse checkout alle template-commits daarna, zet `.template-sha` bij en opent een PR op een
`fleet/*`-branch. De CI van de site merget die PR zelf zodra build, migraties en smoke tests
groen zijn. Twee soorten commits slaat `sync` over:

- **Dependency-bumps** (`chore(deps…`-commits en alles van Dependabot). Die doet Dependabot per
  site al, en een lockfile cherry-picken conflicteert altijd.
- **Merge-commits.**

### Commit-conventie in de template

- Een dependency-bump altijd als **`chore(deps): …`** committen (`package.json` + lockfile).
- Een migratie of codewijziging die bij zo'n bump hoort in een **aparte `fix:`-/`feat:`-commit**.
  Zit die in de `chore(deps)`-commit, dan komt hij niet mee via `sync`.
- Squash-mergen is prima; de squash-titel volgt dezelfde regel.

**Template-commits raken geen site-specifieke bestanden** (`src/app/(frontend)/**`,
`home.ts`, `redirects.json`; zie de tabel in `CLAUDE.md`). Moet een feature iets in de
layout of een pagina zetten, maak dan een core-component in `src/content/` en laat de site
die eenmalig inbouwen. Voorbeeld: head-code komt in `<SiteHead />` (`src/content/head.tsx`),
niet in de layout.

### Bij een conflict

`sync` lost een paar conflicten zelf op: in site-specifieke bestanden (`src/app/(frontend)/**`,
`src/content/home.ts`, `redirects.json`) blijft de site-versie staan, en de PR noemt die
bestanden zodat je kunt nalopen of de template-wijziging er met de hand in moet. In `docs/*`
wint de template; bestanden die de site verwijderd heeft blijven weg.

Bij elk ander conflict stopt `sync` voor die site, houdt wat al wél is toegepast, zet `.template-sha` op de laatste
gelukte commit en meldt in de PR welke commit handwerk is. Die ene commit haal je zelf binnen,
in een **verse clone** van de site:

```bash
git remote add template https://github.com/web-bvdo/payload-railway.git   # eenmalig
git fetch template
git cherry-pick <commit-hash>     # conflicten oplossen: hou de klant-versie
npm install                       # als dependencies wijzigden
npm run generate:types
npm run generate:importmap        # als plugins/Payload-versie wijzigden
npm run migrate:create -- <naam>  # als de fix content-velden raakt
npm run migrate
npm run typecheck && npm run build
echo <commit-hash> > .template-sha   # anders probeert de volgende sync 'm opnieuw
git push
```

Hou bij twijfel de klant-versie. De volgende `./fleet sync` gaat vanaf `.template-sha` verder.

**Sterk afgeweken site?** Als een klant-site ver van de template staat (eigen content-model,
localization, veel eigen pagina's), loopt `sync` steeds op conflicten. Pas dan alleen de losse
infra-wijziging met de hand toe en zet `.template-sha` door. Gebeurt dat vaak, zie
[Toekomst](#toekomst-core-als-npm-package).

⚠️ **Pas op met verouderde lokale checkouts.** Na een repo-rename of een kopie kun je meerdere
mappen hebben die naar dezelfde URL wijzen, waarvan één nog de **oude historie** bevat. Push
daar niet vanuit — dat zet de repo terug. `fleet` werkt daarom altijd in verse checkouts onder
`~/.cache/fleet/`; doe bij handwerk hetzelfde. (Dit ging in de praktijk al bijna mis.)

### Payload-upgrade met migratie: `fleet run`

Dependabot bumpt Payload per site, maar een upgrade die een **core-migratie** nodig heeft moet
versie én migratie in één PR krijgen. Dat is een `fleet run`: een shell-commando in elke site,
PR bij wijziging (ook op een `fleet/*`-branch, dus automatisch gemerged bij groen).

1. Upgrade eerst in de template: `chore(deps): …` met de versies, `fix: …` met de migratie
   (zie [core-migraties](#migraties-in-de-template-core-migraties)).
2. Dan fleet-breed, met de versies en de migratie uit stap 1:
   ```bash
   ./fleet run -m "chore(deps): Payload 3.90.2 + migratie" -- '
     npm i --save-exact payload@3.90.2 @payloadcms/db-postgres@3.90.2 @payloadcms/next@3.90.2 \
       @payloadcms/plugin-mcp@3.90.2 @payloadcms/richtext-lexical@3.90.2 @payloadcms/ui@3.90.2 \
       @payloadcms/storage-s3@3.90.2 &&
     cp "$FLEET_TEMPLATE"/src/migrations/20261006_141717_payload_3_90.ts src/migrations/ &&
     node "$FLEET_TEMPLATE"/scripts/migrations-index.mjs src/migrations
   '
   ```

`$FLEET_TEMPLATE` is een verse checkout van de template, `$FLEET_SITE` de sitenaam;
`scripts/migrations-index.mjs` bouwt `src/migrations/index.ts` opnieuw uit de map. Hetzelfde
recept voor een kritieke CVE die niet op Dependabot kan wachten:
`./fleet run -m "fix(deps): next 16.4.1 (CVE-…)" -- 'npm i --save-exact next@16.4.1'`.

### Migraties in de template (core-migraties)

Alles in `src/migrations/` van de template landt via `fleet sync` (of een `fleet run`) op
**elke** klant-site en draait daar bij de deploy. Een template-migratie moet dus op élke
site-database werken. Regels:

- **Alleen core-tabellen** (`users`, `media`, `payload_*`). Nooit `home` of andere
  content-globals — die verschillen per site; een `ALTER TABLE "home"` breekt de deploy.
  Gegenereerde migratie dus met de hand inkorten.
- **Idempotent**: `ADD COLUMN IF NOT EXISTS`, `DROP COLUMN IF EXISTS`, enz.
- **Geen `.json`-snapshot meecommitten.** `migrate:create` diff't tegen de nieuwste `.json`
  in de map; een template-snapshot zou de site laten diffen tegen het schema van de
  template (alle eigen globals "nieuw").

**Gevolg per site (eenmalig na zo'n update):** de volgende `npm run migrate:create` neemt de
core-wijziging nog een keer op (de snapshot kende 'm niet). Maak die regels in de gegenereerde
migratie idempotent (`IF NOT EXISTS`) — daarna is de snapshot weer bij. Conflict in
`src/migrations/index.ts`? `node scripts/migrations-index.mjs src/migrations` bouwt 'm opnieuw.

## ⚠️ NOOIT doen bij een klant-site

Deze twee hebben in de praktijk al bijna data + code gekost:

- **Nooit `git reset --hard template/main`** (of `origin/main` van de template) in een
  klant-site. `reset --hard` gooit ál het site-specifieke werk weg en vervangt het door de
  kale template. Gebruik altijd `fleet sync` of een losse `cherry-pick`. `reset --hard` is
  alleen veilig in een lege, verse kopie.
- **Nooit `y` drukken op de "You're about to delete … table / DATA LOSS WARNING"-prompt**
  bij `npm run dev`. Die verschijnt als de **code niet meer bij de database past** (meestal
  omdat de code is teruggezet/veranderd terwijl de database nog de oude content heeft).
  Druk `N`, herstel de bijpassende code (`git reflog` → `git reset --hard <jouw-commit>`),
  en start opnieuw. `y` verwijdert onherstelbaar alle content uit die tabellen.

## Versiebeheer

Geen tags of versienummers; de template-commit is de versie.

- **`.template-sha`** in elke site-repo = de laatste template-commit die de site heeft.
  `fleet sync` zet 'm bij; na handmatig cherry-picken zet je 'm zelf door.
- **[`sites.json`](https://github.com/web-bvdo/fleet/blob/main/sites.json)** in fleet = het
  register: repo, URL, Railway-id's en `templateBase` (de template-commit waarvan de site is
  gemaakt, het startpunt zolang `.template-sha` er nog niet is).
- **`./fleet status`** toont per site de Payload-/Next-versie, CI, open Dependabot-PR's en
  hoeveel template-commits de site achterloopt. Draait elke maandag en meldt rood in Teams.

## Productie-checklist (cruciaal bij meerdere sites)

Deze dingen MOETEN per site kloppen — ze zijn geen onderdeel van de template zelf omdat ze
per deployment verschillen:

Het volledige stappenplan staat in [DEPLOY-RAILWAY.md](DEPLOY-RAILWAY.md) en
[NEW-SITE.md](NEW-SITE.md). In het kort, per site:

- [ ] **Geregistreerd in `sites.json`** van web-bvdo/fleet. Anders krijgt de site geen
      template-updates en staat hij niet in de wekelijkse status.
- [ ] **Eigen Railway-project per site.** Deel nooit database, Bucket of secret tussen klanten.
- [ ] **Unieke `PAYLOAD_SECRET` per site.** De template genereert 'm automatisch bij een
      deploy (`${{secret(48)}}`); lokaal regelt `npm run setup` dit.
- [ ] **Database = de Railway Postgres-service** (`DATABASE_URI = ${{Postgres.DATABASE_URL}}`).
      Eigen Postgres per site.
- [ ] **Media = de Railway Bucket** (S3), gekoppeld via de `S3_*`-vars. Uploads in de admin
      blijven zo bewaard en gedeeld tussen dev/prod.
- [ ] **Schema via migrations in productie** (geen dev-push). `npm run migrate:create`
      lokaal, committen; het start-commando draait `payload migrate` bij elke deploy.
- [ ] **Start-commando en healthcheck op `/`** (600 s) in `.railway/railway.ts` én toegepast
      (`railway config plan` zegt "up to date"), zodat een
      mislukte migratie de draaiende versie niet vervangt. Zie [DEPLOY-RAILWAY.md](DEPLOY-RAILWAY.md#start-commando-en-healthcheck).
- [ ] **Admin-wachtwoord gewijzigd** na de eerste login (niet het `.env`-default laten staan).
- [ ] **Backups** van de Postgres-database én de Bucket, per site (Railway biedt DB-backups).
- [ ] **Node-versie** volgens `.nvmrc` (`nvm use`).
- [ ] **Bij livegang: `SITE_URL`** op production plus redirects van de oude site. Zonder
      `SITE_URL` staat de hele site op noindex. Zie [SEO.md](SEO.md).

## Toekomst: core als npm-package

Loopt `fleet sync` bij veel sites steeds op conflicten, dan is de volgende stap: de core
(`src/content/index.tsx`, gedeelde config, scripts) verhuizen naar een privé npm-package
(bv. `@web-bvdo/payload-core`). Sites doen dan `npm update @web-bvdo/payload-core` i.p.v.
cherry-picken. Meer opzetwerk, maar veel schonere updates op schaal. Doen wanneer het aantal
sites (of de conflict-pijn) dat rechtvaardigt — nu nog niet nodig.
