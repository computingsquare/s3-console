import { test, expect } from '@playwright/test'

// Precondition: backend (server/) and a Minio instance must be running and
// reachable through the Vite dev proxy (see README "Local development").
// No DEV_AUTH_HEADER_BYPASS needed: identity headers are set per-test below,
// exercising the real trust-headers code path for both roles.

const BUCKET = `e2e-${Date.now()}`
const ADMIN_HEADERS = { 'X-Forwarded-Email': 'admin@example.com', 'X-Forwarded-Groups': 's3-admin' }
const VIEWER_HEADERS = { 'X-Forwarded-Email': 'viewer@example.com', 'X-Forwarded-Groups': 'users' }

test.describe('admin', () => {
  test.use({ extraHTTPHeaders: ADMIN_HEADERS })

  test.afterAll(async ({ request }) => {
    await request.delete(`/api/buckets/${BUCKET}`, { headers: ADMIN_HEADERS }).catch(() => {})
  })

  test('creates a bucket, uploads, previews and deletes an object', async ({ page }) => {
    await page.goto('/buckets')
    await page.getByRole('button', { name: /create bucket/i }).click()
    await page.getByLabel(/bucket name/i).fill(BUCKET)
    await page.getByRole('dialog').getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByRole('button', { name: BUCKET })).toBeVisible()

    await page.getByRole('button', { name: BUCKET }).click()
    await expect(page).toHaveURL(new RegExp(`/buckets/${BUCKET}/`))

    await page.locator('input[type="file"]').setInputFiles({
      name: 'hello.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello e2e'),
    })
    await expect(page.getByText('hello.txt')).toBeVisible({ timeout: 10_000 })

    await page.getByText('hello.txt').click()
    await expect(page.getByText(/size|taille/i)).toBeVisible()

    await page.getByRole('button', { name: /^delete$|^supprimer$/i }).click()
    await page.getByRole('dialog').getByRole('button', { name: /confirm|confirmer/i }).click()
    await expect(page.getByText('hello.txt')).not.toBeVisible()
  })
})

test.describe('viewer', () => {
  test.use({ extraHTTPHeaders: VIEWER_HEADERS })

  test('does not see admin-only actions', async ({ page }) => {
    await page.goto('/buckets')
    await expect(page.getByRole('button', { name: /create bucket/i })).not.toBeVisible()
  })
})
