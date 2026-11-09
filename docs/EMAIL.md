# E-mail: provider kiezen bij livegang

Alle uitgaande mail van de site (`payload.sendEmail`: formulieren, wachtwoord-reset van
admins) loopt via `src/email.ts`. Welke provider dat is, bepaal je **bij livegang** puur met
env-vars op de production-omgeving, zonder codewijziging:

| Gezet | Provider |
|-------|----------|
| `SMTP_HOST` | SMTP (Resend, Brevo, Postmark…) |
| `MS_CLIENT_ID` | Microsoft 365 via de Graph API |
| geen van beide | geen verzending; Payload logt mails in de console (lokaal, test) |
| beide | fout bij het opstarten: kies er één |

Leg de keuze per site vast in `CLAUDE.site.md`, zodat agents en collega's weten welke het is.

## Welke kies je?

| | SMTP (Resend e.d.) | Microsoft 365 (Graph) |
|---|---|---|
| Wie moet iets doen | wij; de klant (of wij) zet 3 DNS-records | de IT-beheerder van de klant (Entra ID-app, rechten, secret) |
| Codewijziging | nee | nee |
| Onderhoud | geen (API-key verloopt niet) | client secret verloopt (max. 24 maanden), dan stopt mail **stil** |
| Komt in Verzonden items | nee | ja (`saveToSentItems`) |
| Bijlagen | ja | nog niet (gooit een fout, zie `src/email.ts`) |
| Kosten | gratis tier volstaat meestal | binnen de M365 van de klant (gedeelde mailbox heeft geen licentie nodig) |

**Standaard: SMTP via een transactionele dienst.** Kies Microsoft 365 alleen als de klant
expliciet vanuit zijn eigen mailbox wil mailen en een beheerder heeft die de stappen hieronder
uitvoert. Wachtwoord-SMTP via `smtp.office365.com` bouwen we bewust niet: Microsoft faseert
basic auth voor SMTP AUTH uit en SMTP AUTH staat standaard al uit.

## Afzender (beide providers)

```
EMAIL_FROM=website@klant.nl
EMAIL_FROM_NAME=Klant
```

Bij SMTP werken `SMTP_FROM` / `SMTP_FROM_NAME` nog als oudere namen (bestaande sites). Bij
Microsoft 365 is `EMAIL_FROM` de mailbox waaruit verstuurd wordt; de getoonde naam komt uit
die mailbox in M365.

## Optie 1: SMTP met Resend

1. Account op [resend.com](https://resend.com), **Domains → Add domain** `klant.nl`.
2. Zet de DNS-records die Resend toont bij de DNS van de klant:
   - **SPF/bounce:** MX + TXT op subdomein `send` (`send.klant.nl`). Het SPF-record op het
     hoofddomein en de MX van de eigen mail van de klant blijven dus ongemoeid;
   - **DKIM:** TXT `resend._domainkey` (de waarde uit Resend).
   Wacht tot Resend het domein als *Verified* toont.
3. **API Keys → Create** (alleen *Sending access*, beperkt tot dit domein).
4. Railway, production-omgeving:
   ```
   SMTP_HOST=smtp.resend.com
   SMTP_PORT=587
   SMTP_USER=resend
   SMTP_PASS=<api-key>
   EMAIL_FROM=website@klant.nl
   EMAIL_FROM_NAME=Klant
   ```
   Blokkeert Railway poort 587 (time-out), gebruik dan `SMTP_PORT=2587`.

Brevo of Postmark werken hetzelfde: hun SMTP-host, -user en -wachtwoord in dezelfde vars.

## Optie 2: Microsoft 365 via Graph

Stappen voor de **IT-beheerder van de klant**:

1. **Mailbox:** maak (of kies) de afzender, bij voorkeur een **gedeelde mailbox** zoals
   `website@klant.nl`. Die heeft geen licentie nodig.
2. **Entra ID → App registrations → New registration**, bv. "Website e-mail". Single tenant,
   geen redirect-URI.
3. **API permissions → Add → Microsoft Graph → Application permissions → `Mail.Send`**, dan
   **Grant admin consent**. Let op: *Application*, niet *Delegated*.
4. **Certificates & secrets → New client secret.** Maximaal 24 maanden geldig. Zet direct een
   **agenda-herinnering** ruim vóór de vervaldatum: verloopt hij, dan stopt alle mail van de
   site zonder melding op de site zelf (alleen een fout in de logs).
5. **Beperk de app tot die ene mailbox.** Zonder deze stap mag de app namens élke mailbox in
   de tenant mailen. Via Exchange Online PowerShell:
   ```powershell
   New-DistributionGroup -Name "Website e-mail" -Type Security -PrimarySmtpAddress website-app@klant.nl
   Add-DistributionGroupMember -Identity "Website e-mail" -Member website@klant.nl
   New-ApplicationAccessPolicy -AppId <client-id> -PolicyScopeGroupId website-app@klant.nl `
     -AccessRight RestrictAccess -Description "Website mag alleen als website@klant.nl mailen"
   Test-ApplicationAccessPolicy -AppId <client-id> -Identity website@klant.nl   # → Granted
   ```
   Of de nieuwere **RBAC for Applications** in Exchange Online (management scope op die
   mailbox + rol *Application Mail.Send*); dan geen tenant-brede `Mail.Send` in Entra geven.
6. Lever aan ons aan: **Tenant ID**, **Client ID** (Application ID), **Client secret** (via een
   veilige weg, niet per gewone mail) en het mailboxadres.

DNS: bij M365-klanten bevat de SPF al `include:spf.protection.outlook.com`; er hoeft niets bij.
DKIM voor het domein kan de beheerder optioneel aanzetten in Microsoft Defender (aan te raden).

Railway, production-omgeving:

```
MS_TENANT_ID=<tenant-id>
MS_CLIENT_ID=<client-id>
MS_CLIENT_SECRET=<client-secret>
EMAIL_FROM=website@klant.nl
```

## Testen bij livegang

Verstuur een testmail via het live domein, bv. **/admin → uitloggen → Wachtwoord vergeten**
met je eigen admin-account, of een formulier van de site. Komt er niets aan, kijk dan in de
Railway-logs: de foutmelding van Resend/Microsoft staat er letterlijk in (bv. `403` = rechten
of access policy, `401`/token-fout = verkeerde of verlopen secret).
