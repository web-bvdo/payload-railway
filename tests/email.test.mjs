// Providerkeuze en adres-normalisatie van src/email.ts. Draai met `npm test`
// (Node's eigen testrunner; Node ≥ 22.18 leest de .ts zelf).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { emailAdapter, toRecipients } from '../src/email.ts'

test('toRecipients normaliseert string, Address en arrays', () => {
  assert.deepEqual(toRecipients(undefined), [])
  assert.deepEqual(toRecipients('a@b.nl'), [{ emailAddress: { address: 'a@b.nl' } }])
  assert.deepEqual(toRecipients('"Doe, Jan" <jan@b.nl>, Piet <piet@b.nl>'), [
    { emailAddress: { address: 'jan@b.nl', name: 'Doe, Jan' } },
    { emailAddress: { address: 'piet@b.nl', name: 'Piet' } },
  ])
  assert.deepEqual(toRecipients(['x@b.nl', { address: 'y@b.nl', name: 'Y' }]), [
    { emailAddress: { address: 'x@b.nl' } },
    { emailAddress: { address: 'y@b.nl', name: 'Y' } },
  ])
})

test('providerkeuze op env-vars', async () => {
  assert.equal(emailAdapter({}), undefined)
  assert.throws(() => emailAdapter({ MS_CLIENT_ID: 'x', SMTP_HOST: 'y' }), /Kies één provider/)
  assert.throws(() => emailAdapter({ MS_CLIENT_ID: 'x' }), /MS_TENANT_ID/)

  const graph = emailAdapter({ MS_CLIENT_ID: 'c', MS_TENANT_ID: 't', MS_CLIENT_SECRET: 's', EMAIL_FROM: 'web@b.nl' })
  assert.equal(graph({}).name, 'microsoft-graph')

  // Poort 9 op localhost weigert meteen; de verify-fout logt de adapter alleen.
  const smtp = await emailAdapter({ SMTP_HOST: '127.0.0.1', SMTP_PORT: '9', SMTP_FROM: 'oud@b.nl' })
  const s = smtp({})
  assert.equal(s.name, 'nodemailer')
  assert.equal(s.defaultFromAddress, 'oud@b.nl')
})

test('Graph: token één keer ophalen, sendMail met de juiste body', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, init })
    if (url.includes('/token')) return Response.json({ access_token: 'tok', expires_in: 3600 })
    return new Response(null, { status: 202 })
  })
  const adapter = emailAdapter({ MS_CLIENT_ID: 'c', MS_TENANT_ID: 't', MS_CLIENT_SECRET: 's', EMAIL_FROM: 'web@b.nl' })({})
  await adapter.sendEmail({ to: 'Jan <jan@b.nl>', subject: 'Hoi', html: '<p>x</p>' })
  await adapter.sendEmail({ to: 'piet@b.nl', subject: 'Hoi', text: 'x' })

  assert.equal(calls.filter((c) => c.url.includes('/token')).length, 1)
  const send = calls[1]
  assert.equal(send.url, 'https://graph.microsoft.com/v1.0/users/web%40b.nl/sendMail')
  assert.equal(send.init.headers.Authorization, 'Bearer tok')
  const body = JSON.parse(send.init.body)
  assert.deepEqual(body.message.body, { contentType: 'HTML', content: '<p>x</p>' })
  assert.deepEqual(body.message.toRecipients, [{ emailAddress: { address: 'jan@b.nl', name: 'Jan' } }])
  assert.equal(body.saveToSentItems, true)
  assert.equal(JSON.parse(calls[2].init.body).message.body.contentType, 'Text')

  await assert.rejects(adapter.sendEmail({ to: 'a@b.nl', attachments: [{ filename: 'x' }] }), /bijlagen/)
})
