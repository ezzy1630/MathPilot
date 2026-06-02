import { test, expect } from '@playwright/test'

function seedOnboardedState() {
  localStorage.clear()
  const mastery = {
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
  }
  const attempts = [
    {
      id: 'a1',
      problemId: 'p1',
      skillIds: ['chain_rule'],
      answer: 'x',
      correct: true,
      mode: 'guided_practice',
      hintCount: 0,
      seconds: 30,
      mixed: false,
      delayed: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]
  localStorage.setItem(
    'mathpilot.local.sqlite-facade.v3',
    JSON.stringify({
      profileName: 'Math display',
      currentFocus: 'Calculus 1',
      onboarded: true,
      advancedMode: false,
      mastery,
      attempts,
    }),
  )
}

test.describe('Math display', () => {
  test('activity page typesets the problem prompt with math-field', async ({ page }) => {
    await page.addInitScript(seedOnboardedState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('today-continue').click()
    await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible({ timeout: 15_000 })

    const problemCard = page.locator('section.problem-card')
    await expect(problemCard).toBeVisible()
    await expect(problemCard.locator('math-field.math-display')).toBeVisible({ timeout: 10_000 })
  })
})
