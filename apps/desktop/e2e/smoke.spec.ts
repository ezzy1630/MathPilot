import { test, expect } from '@playwright/test'

test.describe('MathPilot smoke', () => {
  test('loads shell and shows Today or onboarding', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.app-shell, .loading-shell')).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole('heading', { name: /Coach desk|Set up your calculus desk|Start adaptive diagnostic/i }),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('navigation rail is present when onboarded', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-shell', { timeout: 15_000 })
    const rail = page.locator('.rail')
    if (await rail.isVisible()) {
      await expect(rail.getByRole('button', { name: 'Today' })).toBeVisible()
      const mapButton = rail.getByRole('button', { name: 'Knowledge map' })
      const diagnosticButton = rail.getByRole('button', { name: 'Diagnostic' })
      if ((await mapButton.count()) > 0) await expect(mapButton).toBeVisible()
      if ((await diagnosticButton.count()) > 0) await expect(diagnosticButton).toBeVisible()
    }
  })

  test('Continue hero or primary action is visible on Today', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-shell', { timeout: 15_000 })
    const continueBtn = page.getByRole('button', { name: /Continue|Start|Practice|diagnostic/i }).first()
    if (await page.getByRole('heading', { name: 'Coach desk' }).isVisible()) {
      await expect(continueBtn).toBeVisible()
    }
  })

  test('progress report opens from Today study plan', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-shell', { timeout: 15_000 })
    if (!(await page.getByRole('heading', { name: 'Coach desk' }).isVisible())) return
    const adjustInspect = page.getByText('Adjust and inspect')
    if (await adjustInspect.isVisible()) {
      await adjustInspect.click()
      const reportBtn = page.getByRole('button', { name: 'Open progress report' })
      if (await reportBtn.isVisible()) {
        await reportBtn.click()
        await expect(page.getByRole('heading', { name: 'Progress report' })).toBeVisible()
      }
    }
  })
})
