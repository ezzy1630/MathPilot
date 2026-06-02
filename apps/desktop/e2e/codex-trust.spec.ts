import { test, expect } from '@playwright/test'

function seedOnboardedState() {
  localStorage.clear()
  localStorage.setItem(
    'mathpilot.local.sqlite-facade.v3',
    JSON.stringify({
      profileName: 'Codex E2E',
      currentFocus: 'Calculus 1',
      onboarded: true,
      advancedMode: false,
      mastery: {
        chain_rule: {
          skillId: 'chain_rule',
          masteryScore: 0.35,
          masteryState: 'Weak',
          fluencyScore: 0.35,
          retentionScore: 0.35,
          conceptualScore: 0.35,
          proceduralScore: 0.35,
          transferScore: 0.28,
          evidenceCount: 2,
          recentFailures: 0,
          reviewDue: '2099-01-01',
        },
      },
      attempts: [],
      preferences: {
        tone: 'warm',
        gamificationLevel: 'minimal',
        notificationsEnabled: false,
        reportsMode: 'on_demand_only',
        enableCodexResourceSearch: false,
      },
    }),
  )
}

test.describe('Codex trust (browser)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(seedOnboardedState)
    await page.reload()
  })

  test('settings paste-back rejects malformed JSON', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByPlaceholder('Paste Codex JSON response').fill('{ not valid json')
    await page.getByRole('button', { name: 'Apply response' }).click()
    await expect(page.getByText(/could not parse json/i)).toBeVisible({ timeout: 8000 })
  })

  test('settings paste-back applies valid tutor JSON', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByPlaceholder('Paste Codex JSON response').fill(
      JSON.stringify({
        feedback_to_user: 'Try identifying the inner function first.',
        mistake_tags: ['method_selection:needs_review'],
      }),
    )
    await page.getByRole('button', { name: 'Apply response' }).click()
    await expect(page.getByText(/codex response applied/i)).toBeVisible({ timeout: 8000 })
  })
})
