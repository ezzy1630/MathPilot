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
    {
      id: 'a2',
      problemId: 'p2',
      skillIds: ['chain_rule'],
      answer: 'x',
      correct: false,
      mode: 'guided_practice',
      hintCount: 0,
      seconds: 30,
      mixed: false,
      delayed: false,
      createdAt: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'a3',
      problemId: 'p3',
      skillIds: ['limits_intro'],
      answer: '1',
      correct: true,
      mode: 'guided_practice',
      hintCount: 0,
      seconds: 30,
      mixed: false,
      delayed: false,
      createdAt: '2026-01-03T00:00:00.000Z',
    },
  ]
  localStorage.setItem(
    'mathpilot.local.sqlite-facade.v3',
    JSON.stringify({
      profileName: 'Acceptance',
      currentFocus: 'Calculus 1',
      onboarded: true,
      advancedMode: false,
      mastery,
      attempts,
    }),
  )
}

function seedActiveDiagnosticState() {
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
  localStorage.setItem(
    'mathpilot.local.sqlite-facade.v3',
    JSON.stringify({
      profileName: 'Acceptance',
      currentFocus: 'Calculus 1',
      onboarded: true,
      advancedMode: false,
      mastery,
      attempts: [],
      diagnostic: {
        id: 'diag-active',
        startedAt: '2026-01-04T00:00:00.000Z',
        targetCount: 25,
        answeredCount: 3,
        currentIndex: 0,
        queue: ['diagnostic-chain-setup'],
        weakSkills: ['chain_rule'],
        strongSkills: [],
        completed: false,
      },
    }),
  )
}

test.describe('MathPilot acceptance', () => {
  test('onboarding through diagnostic entry', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Set up your calculus desk' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Calculus 1' }).click()
    await page.getByRole('button', { name: 'Start adaptive diagnostic' }).click()
    await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible({ timeout: 15_000 })
  })

  test('onboarded user continues to activity and opens map', async ({ page }) => {
    await page.addInitScript(seedOnboardedState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    const recommendation = page.getByRole('region', { name: 'Recommended next move' })
    await expect(recommendation.getByText('Continue', { exact: true })).toBeVisible()
    await expect(recommendation.getByRole('button', { name: 'Why', exact: true })).toBeVisible()
    await expect(page.getByTestId('today-adjust')).toBeVisible()
    const continueBtn = recommendation.getByRole('button', { name: /Start session|Start repair|Start review|Resume diagnostic/i })
    await continueBtn.click()
    await expect(page.getByRole('button', { name: 'Check answer' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('complementary', { name: 'Teaching inspector' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Hint' })).toBeVisible()
    await expect(page.getByRole('button', { name: "I'm lost" })).toBeVisible()
    await expect(page.getByText('More help', { exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Knowledge map', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Knowledge map wheel' })).toBeVisible()
    await expect(page.getByText('Recommendation evidence')).toBeVisible()
  })

  test('attempt history panel is searchable from Today', async ({ page }) => {
    await page.addInitScript(seedOnboardedState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await page.getByText('More for today').click()
    await page.getByTestId('today-open-history').click()
    await expect(page.getByRole('dialog', { name: 'Attempt history' })).toBeVisible()
    await page.getByTestId('attempt-history-search').fill('chain')
    await expect(page.getByTestId('attempt-history-row').first()).toBeVisible()
  })

  test('syllabus mapping panel accepts extracted topics', async ({ page }) => {
    await page.addInitScript(seedOnboardedState)
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    const textarea = page.locator('.syllabus-upload')
    await textarea.fill('Week 1: Limits and continuity\nMidterm 3/15\nWeek 2: Chain rule derivatives')
    await textarea.blur()
    await expect(page.getByTestId('syllabus-mapping-panel')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('syllabus-mapping-done').click()
    await expect(page.getByText(/active/)).toBeVisible()
  })

  test('leaving an active diagnostic shows map instead of stacking activity underneath', async ({ page }) => {
    await page.addInitScript(seedActiveDiagnosticState)
    page.on('dialog', (dialog) => dialog.accept())
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Recommended next move')).toBeVisible()
    await page.getByRole('button', { name: 'Knowledge map', exact: true }).click()
    await expect(page.getByRole('img', { name: 'Knowledge map wheel' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Check answer' })).toBeHidden()
  })
})
