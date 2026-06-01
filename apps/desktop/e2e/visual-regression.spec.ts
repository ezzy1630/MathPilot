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

async function startActivity(page: Page) {
  await page.getByTestId('today-start').click()
  await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible()
}

test.describe('visual regression', () => {
  test('Today coach desk matches snapshot', async ({ page }) => {
    await page.addInitScript(seedVisualState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('today-continue')).toBeVisible()
    await expect(page.locator('.today-page')).toHaveScreenshot('today-coach-desk.png', {
      maxDiffPixelRatio: 0.03,
    })
  })

  test('Activity studio matches snapshot', async ({ page }) => {
    await page.addInitScript(seedVisualState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await startActivity(page)
    await expect(page.getByRole('complementary', { name: 'Teaching inspector' })).toBeVisible()
    await expect(page.locator('.activity-page')).toHaveScreenshot('activity-studio.png', {
      maxDiffPixelRatio: 0.03,
    })
  })
})
