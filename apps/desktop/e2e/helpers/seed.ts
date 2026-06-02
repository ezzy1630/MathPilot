import type { Page } from '@playwright/test'

export function seedOnboardedState() {
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

export async function openActivityFromToday(page: Page) {
  await page.getByTestId('today-continue').click()
  await page.getByRole('button', { name: 'Check answer' }).waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('.activity-page').waitFor({ state: 'visible' })
}
