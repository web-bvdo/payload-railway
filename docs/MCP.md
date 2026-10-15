# Teksten aanpassen via Claude Code (MCP)

Elke site heeft een MCP-endpoint op `https://<site>/api/mcp` (plugin `@payloadcms/plugin-mcp`).
Daarmee kan een collega in Claude Code vragen: *"pas de intro op de homepage aan naar …"*.
De wijziging staat direct live: geen deploy, geen Git- of Railway-toegang nodig.

## Wat een key mag

Elke geldige key mag **alle content-pagina's (globals) lezen en bijwerken**, en verder niets:
geen gebruikers, geen media, niets verwijderen. Een nieuwe pagina (`npm run new:page`) komt
er vanzelf bij.

Bewust alles-of-niets per key: vinkjes per pagina zouden per site andere databasekolommen
geven, dus een migratie per site. Zie `payload.config.ts`.

## Een collega toegang geven

1. Maak in `/admin` → **Users** een account voor de collega (eigen e-mail).
2. De collega logt in en maakt onder **MCP → API Keys** een key: label = eigen naam,
   **Enable API Key** aan, en kopieert de key.
   (Een key hoort altijd bij de gebruiker die hem maakt. Zo zie je wie wat deed.)
3. De collega koppelt de site eenmalig in Claude Code:

   ```bash
   claude mcp add --transport http <klantnaam> https://<site>/api/mcp --header "Authorization: Bearer <api-key>"
   ```

**Intrekken:** verwijder de key (of zet *Enable API Key* uit) onder MCP → API Keys.

## Goed om te weten

- Keys horen bij één omgeving (staging of productie) en reizen niet mee met `npm run promote`.
- Een key verloopt niet. Trek hem in als iemand vertrekt of de key gelekt kan zijn.
- Tekst die in de code staat (niet in de admin), wijzig je via GitHub en een PR, niet via MCP.
