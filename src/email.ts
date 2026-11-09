import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type { EmailAdapter, SendEmailOptions } from 'payload'

// Uitgaande mail (payload.sendEmail, ook wachtwoord-reset van admins). De provider kies je
// bij livegang puur met env-vars, zie docs/EMAIL.md:
// - MS_CLIENT_ID gezet → Microsoft 365 via de Graph API (mailen via de eigen M365 van de klant)
// - SMTP_HOST gezet    → SMTP (transactionele dienst zoals Resend, Brevo, Postmark)
// - geen van beide     → geen adapter: Payload logt mails alleen in de console
// - beide              → fout, want dan is onduidelijk welke bedoeld is
type Env = Record<string, string | undefined>

export function emailAdapter(env: Env = process.env): EmailAdapter | Promise<EmailAdapter> | undefined {
  if (env.MS_CLIENT_ID && env.SMTP_HOST) {
    throw new Error('E-mail: zowel MS_CLIENT_ID als SMTP_HOST is gezet. Kies één provider, zie docs/EMAIL.md.')
  }
  if (env.MS_CLIENT_ID) return graphAdapter(env)
  if (env.SMTP_HOST) {
    const port = Number(env.SMTP_PORT || 587)
    return nodemailerAdapter({
      // SMTP_FROM/SMTP_FROM_NAME: oudere namen, blijven werken voor bestaande sites.
      defaultFromAddress: env.EMAIL_FROM || env.SMTP_FROM || env.SMTP_USER || '',
      defaultFromName: env.EMAIL_FROM_NAME || env.SMTP_FROM_NAME || 'Website',
      transportOptions: {
        host: env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      },
    })
  }
  return undefined
}

type Recipient = { emailAddress: { address: string; name?: string } }

// string | Address | array daarvan → Graph-ontvangers. Strings mogen "Naam <a@b.nl>" zijn
// en meerdere adressen met komma's bevatten (komma's binnen "..." tellen niet).
export function toRecipients(value: SendEmailOptions['to']): Recipient[] {
  if (!value) return []
  if (Array.isArray(value)) return value.flatMap((v) => toRecipients(v))
  if (typeof value !== 'string') {
    return value.address ? [{ emailAddress: { address: value.address, ...(value.name && { name: value.name }) } }] : []
  }
  return (value.match(/(?:"[^"]*"|[^,])+/g) ?? []).flatMap((part) => {
    const m = part.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
    const address = (m ? m[2] : part).trim()
    const name = m?.[1].trim()
    return address ? [{ emailAddress: { address, ...(name && { name }) } }] : []
  })
}

function graphAdapter(env: Env): EmailAdapter {
  const { MS_TENANT_ID: tenant, MS_CLIENT_ID: clientId, MS_CLIENT_SECRET: secret, EMAIL_FROM: from } = env
  if (!tenant || !secret || !from) {
    throw new Error('E-mail via Microsoft 365: MS_TENANT_ID, MS_CLIENT_SECRET en EMAIL_FROM zijn verplicht naast MS_CLIENT_ID.')
  }
  let token: { value: string; expires: number } | undefined

  async function getToken() {
    if (token && Date.now() < token.expires) return token.value
    const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: secret!,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    })
    if (!res.ok) throw new Error(`Microsoft-token ophalen mislukt (${res.status}): ${await res.text()}`)
    const data = (await res.json()) as { access_token: string; expires_in: number }
    // Vijf minuten marge, zodat een token niet halverwege een verzending verloopt.
    token = { value: data.access_token, expires: Date.now() + (data.expires_in - 300) * 1000 }
    return token.value
  }

  return () => ({
    name: 'microsoft-graph',
    defaultFromAddress: from,
    // De afzendernaam komt bij Graph uit de mailbox in M365; dit is alleen voor Payload.
    defaultFromName: env.EMAIL_FROM_NAME || 'Website',
    // message.from wordt genegeerd: de app mag (en hoort) alleen vanuit EMAIL_FROM te mailen.
    sendEmail: async (message) => {
      // ponytail: geen bijlagen. Toevoegen (fileAttachment met base64 contentBytes, max ±3 MB
      // per bericht) zodra een formulier of hook bijlagen moet versturen.
      if (message.attachments?.length) {
        throw new Error('E-mail via Microsoft 365 ondersteunt (nog) geen bijlagen, zie src/email.ts.')
      }
      const isHtml = message.html != null
      const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: message.subject ?? '',
            body: { contentType: isHtml ? 'HTML' : 'Text', content: String((isHtml ? message.html : message.text) ?? '') },
            toRecipients: toRecipients(message.to),
            ccRecipients: toRecipients(message.cc),
            bccRecipients: toRecipients(message.bcc),
            replyTo: toRecipients(message.replyTo),
          },
          saveToSentItems: true,
        }),
      })
      if (res.status !== 202) throw new Error(`Microsoft Graph sendMail mislukt (${res.status}): ${await res.text()}`)
    },
  })
}
