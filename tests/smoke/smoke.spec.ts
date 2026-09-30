import { expect, test } from '@playwright/test'

// Algemene smoke tests die voor elke Payload + Next.js site werken.
// Site-specifieke checks (bv. een contactformulier) kun je als extra
// *.spec.ts-bestand in deze map zetten; ze draaien dan automatisch mee.

test('homepage geeft geen serverfout en geen JavaScript-crash', async ({ page }) => {
  const jsErrors: string[] = []
  page.on('pageerror', (error) => jsErrors.push(error.message))

  const response = await page.goto('/', { waitUntil: 'load' })
  expect(response, 'geen antwoord van de server').not.toBeNull()
  // < 500: een 404 is oké in CI (lege database, nog geen homepage-content).
  expect(response!.status(), 'statuscode van de homepage').toBeLessThan(500)

  // Geeft React/Next.js de kans om te hydrateren en eventuele fouten te gooien.
  await page.waitForTimeout(1_000)
  expect(jsErrors, 'JavaScript-fouten in de browser').toEqual([])
})

test('Payload-admin laadt en toont het inlogscherm', async ({ page }) => {
  const response = await page.goto('/admin')
  expect(response, 'geen antwoord van de server').not.toBeNull()
  expect(response!.status(), 'statuscode van /admin').toBeLessThan(400)

  // Login- of "eerste gebruiker aanmaken"-scherm; beide hebben een e-mailveld.
  await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({
    timeout: 20_000,
  })
})

test('Payload REST-API reageert', async ({ request }) => {
  const response = await request.get('/api/access')
  expect(response.status(), 'statuscode van /api/access').toBe(200)
  expect(response.headers()['content-type'] ?? '').toContain('application/json')
})
