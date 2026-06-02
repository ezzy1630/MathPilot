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
  localStorage.setItem(
    'mathpilot.local.sqlite-facade.v3',
    JSON.stringify({
      profileName: 'PersistTest',
      currentFocus: 'Calculus 1',
      onboarded: true,
      advancedMode: false,
      mastery,
      attempts: [],
      reviewQueue: [],
      problems: {},
      homeworkAnalyses: [],
      changelog: [],
    }),
  )
}

test.describe('persistence (browser dev)', () => {
  test('RESET clears profile and returns to onboarding', async ({ page }) => {
    await page.addInitScript(seedOnboardedState)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByPlaceholder('Type RESET to confirm wipe').fill('RESET')
    await page.getByRole('button', { name: /^reset$/i }).click()
    await expect(page.getByRole('heading', { name: 'Set up your calculus desk' })).toBeVisible({
      timeout: 15_000,
    })
    const onboarded = await page.evaluate(() => {
      const raw = localStorage.getItem('mathpilot.local.sqlite-facade.v3')
      if (!raw) return false
      return (JSON.parse(raw) as { onboarded?: boolean }).onboarded === true
    })
    expect(onboarded).toBe(false)
  })

  test('relational reload preserves stored mastery', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
      const mastery = {
        chain_rule: {
          skillId: 'chain_rule',
          masteryScore: 0.88,
          masteryState: 'Solid',
          fluencyScore: 0.88,
          retentionScore: 0.88,
          conceptualScore: 0.88,
          proceduralScore: 0.88,
          transferScore: 0.88,
          evidenceCount: 5,
          recentFailures: 0,
        },
      }
      localStorage.setItem('mathpilot.relational.v1.mastery', JSON.stringify(mastery))
      localStorage.setItem(
        'mathpilot.relational.v1.settings',
        JSON.stringify({
          profileName: 'ArchiveUser',
          currentFocus: 'Calculus 1',
          onboarded: true,
          advancedMode: false,
        }),
      )
      localStorage.setItem('mathpilot.relational.v1.review', '[]')
      localStorage.setItem('mathpilot.relational.v1.problems', '{}')
      localStorage.setItem('mathpilot.relational.v1.attempts', '[]')
      localStorage.setItem('mathpilot.relational.v1.homework', '[]')
      localStorage.setItem('mathpilot.relational.v1.changelog', '[]')
    })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Coach desk' })).toBeVisible({ timeout: 15_000 })
    const score = await page.evaluate(() => {
      const raw = localStorage.getItem('mathpilot.relational.v1.mastery')
      if (!raw) return 0
      const mastery = JSON.parse(raw) as { chain_rule?: { masteryScore?: number } }
      return mastery.chain_rule?.masteryScore ?? 0
    })
    expect(score).toBeGreaterThan(0.8)
    await expect(page.getByText('ArchiveUser').first()).toBeVisible()
  })
})
