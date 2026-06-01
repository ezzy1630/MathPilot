import { describe, expect, it } from 'vitest'
import { maybeAutoMaintenance, runMaintenance } from './maintenance'
import { createInitialState } from './learningEngine'

describe('maintenance', () => {
  it('produces changelog, backup, and job outputs', () => {
    const state = createInitialState('Calculus 1')
    state.attempts = Array.from({ length: 50 }, (_, i) => ({
      id: `a-${i}`,
      problemId: 'p',
      skillIds: ['chain_rule'],
      answer: 'x',
      correct: true,
      mode: 'guided' as const,
      hintCount: 0,
      seconds: 60,
      mixed: false,
      delayed: false,
      createdAt: new Date().toISOString(),
      masteryDelta: 0.05,
    }))
    const next = runMaintenance(state, 'developer')
    expect(next.maintenanceRuns?.[0].jobsRun.length).toBeGreaterThan(0)
    expect(next.maintenanceRuns?.[0].backupsCreated.length).toBe(1)
    expect(next.changelog[0]).toContain('Maintenance')
    expect(next.maintenanceRuns?.[0].jobsRun).toContain('skill_audit')
    expect(next.maintenanceRuns?.[0].jobsRun).toContain('skill_improvement')
  })

  it('records skill improvement recommendations when mastery is weak', () => {
    const state = createInitialState('Calculus 1')
    state.mastery.chain_rule = {
      ...state.mastery.chain_rule,
      masteryScore: 0.3,
      recentFailures: 3,
    }
    state.mistakePatterns['setup:missing_equation'] = {
      tag: 'setup:missing_equation',
      skillIds: ['related_rates'],
      count: 5,
      lastSeen: new Date().toISOString(),
      note: 'test',
    }
    const next = runMaintenance(state, 'manual')
    const run = next.maintenanceRuns?.[0]
    expect(run?.skillsUpdated.length).toBeGreaterThan(0)
    expect(run?.changesMade.some((c) => c.startsWith('Recommendation:'))).toBe(true)
  })

  it('auto-runs maintenance after three completed sessions', () => {
    const state = createInitialState('Calculus 1')
    state.sessionsSinceMaintenance = 3
    const next = maybeAutoMaintenance(state)
    expect(next.maintenanceRuns?.length).toBe(1)
    expect(next.sessionsSinceMaintenance).toBe(0)
  })
})
