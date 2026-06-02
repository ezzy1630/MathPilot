import { test, expect } from '@playwright/test'
import { openActivityFromToday, seedOnboardedState } from './helpers/seed'

test.describe('visual regression', () => {
  test('Today coach desk matches snapshot', async ({ page }) => {
    await page.addInitScript(seedOnboardedState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('today-continue')).toBeVisible()
    await expect(page.locator('.today-page')).toHaveScreenshot('today-coach-desk.png', {
      maxDiffPixelRatio: 0.03,
    })
  })

  test('Settings page matches snapshot', async ({ page }) => {
    await page.addInitScript(seedOnboardedState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(
      page.getByText('Browser preview uses deterministic math fallbacks'),
    ).toBeVisible()
    await expect(page.locator('.settings-grid')).toHaveScreenshot('settings-page.png', {
      maxDiffPixelRatio: 0.03,
    })
  })

  test('Activity studio matches snapshot', async ({ page }) => {
    await page.addInitScript(seedOnboardedState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await openActivityFromToday(page)
    await expect(page.getByRole('complementary', { name: 'Teaching inspector' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('.activity-page')).toHaveScreenshot('activity-studio.png', {
      maxDiffPixelRatio: 0.03,
    })
  })

  test('Knowledge map matches snapshot', async ({ page }) => {
    await page.addInitScript(seedOnboardedState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Knowledge map' }).click()
    await expect(page.getByRole('img', { name: 'Knowledge map wheel' })).toBeVisible()
    await expect(page.locator('.map-page')).toHaveScreenshot('knowledge-map.png', {
      maxDiffPixelRatio: 0.03,
    })
  })

  test('Command palette matches snapshot', async ({ page }) => {
    await page.addInitScript(seedOnboardedState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await page.keyboard.press('Meta+k')
    await expect(page.getByRole('dialog', { name: 'Search and commands' })).toBeVisible()
    await expect(page.locator('.command-palette-modal')).toHaveScreenshot('command-palette.png', {
      maxDiffPixelRatio: 0.03,
    })
  })

  test('Onboarding matches snapshot', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Set up your calculus desk' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.locator('.onboarding')).toHaveScreenshot('onboarding.png', {
      maxDiffPixelRatio: 0.03,
    })
  })

  test('Homework upload modal matches snapshot', async ({ page }) => {
    await page.addInitScript(seedOnboardedState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await page.getByText('More for today').click()
    await page.getByRole('button', { name: 'Upload or review homework' }).click()
    await expect(page.getByRole('dialog', { name: 'Upload homework' })).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Upload homework' })).toHaveScreenshot(
      'homework-upload-modal.png',
      { maxDiffPixelRatio: 0.03 },
    )
  })
})
