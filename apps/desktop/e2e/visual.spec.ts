import { test, expect, type Page } from '@playwright/test'

function seedVisualState() {
  localStorage.clear()
  localStorage.setItem(
    'mathpilot.local.sqlite-facade.v3',
    JSON.stringify({
      profileName: 'Visual QA',
      currentFocus: 'Calculus 1',
      onboarded: true,
      advancedMode: true,
      mastery: {
        chain_rule: {
          skillId: 'chain_rule',
          masteryScore: 0.32,
          masteryState: 'Weak',
          fluencyScore: 0.32,
          retentionScore: 0.32,
          conceptualScore: 0.32,
          proceduralScore: 0.32,
          transferScore: 0.24,
          evidenceCount: 2,
          recentFailures: 1,
          reviewDue: '2026-05-31',
        },
      },
      attempts: [],
    }),
  )
}

async function attachViewport(page: Page, name: string) {
  const image = await page.screenshot({ fullPage: false })
  expect(image.length).toBeGreaterThan(20_000)
  await test.info().attach(name, { body: image, contentType: 'image/png' })
}

test.describe('visual QA surfaces', () => {
  test('captures finished app surfaces for review', async ({ page }) => {
    await page.addInitScript(seedVisualState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    const recommendation = page.getByRole('region', { name: 'Recommended next move' })
    await expect(recommendation.locator('p.eyebrow').filter({ hasText: /^Continue$/ })).toBeVisible()
    await expect(page.getByTestId('today-continue')).toBeVisible()
    await attachViewport(page, 'today-coach-desk.png')

    await page.getByTestId('today-continue').click()
    await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible()
    const inspector = page.getByRole('complementary', { name: 'Teaching inspector' })
    await expect(inspector).toBeVisible()
    await attachViewport(page, 'activity-studio.png')

    await page.getByRole('button', { name: 'Check answer' }).click()
    await expect(
      page.getByRole('complementary', { name: /Next move|Keep moving|Teaching inspector/ }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: /Next move|Keep moving/ })).toBeVisible()
    await attachViewport(page, 'teaching-feedback.png')

    await page.getByRole('button', { name: 'Knowledge map', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Knowledge map wheel' })).toBeVisible()
    await attachViewport(page, 'knowledge-map.png')

    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await attachViewport(page, 'settings.png')
  })

  test('captures first-run empty state', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Set up your calculus desk' })).toBeVisible({ timeout: 15_000 })
    await attachViewport(page, 'empty-onboarding.png')
  })

  test('captures narrow coach desk and activity layouts', async ({ page }) => {
    await page.setViewportSize({ width: 860, height: 900 })
    await page.addInitScript(seedVisualState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await attachViewport(page, 'today-narrow.png')
    await page.getByTestId('today-continue').click()
    await expect(page.getByRole('complementary', { name: 'Teaching inspector' })).toBeVisible()
    await attachViewport(page, 'activity-narrow.png')
  })
})
