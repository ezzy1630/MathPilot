import { describe, expect, it } from 'vitest'
import {
  buildDeterministicMaintenanceInsight,
  maintenanceCuratorFallbackSummary,
  shouldRunMaintenanceCurator,
} from './maintenanceCurator'
import type { MaintenanceRun } from './maintenance'
import { createInitialState } from './learningEngine'

describe('maintenanceCurator', () => {
  it('joins changesMade for fallback summary', () => {
    const run: MaintenanceRun = {
      id: 'm1',
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:01:00.000Z',
      trigger: 'manual',
      jobsRun: ['skill_audit'],
      changesMade: ['Skill graph audit: no issues.', 'Snapshot backup-1 (12 KB).'],
      backupsCreated: ['backup-1'],
      skillsUpdated: [],
      memoriesUpdated: [],
      problemBankChanges: [],
      resourceRankChanges: [],
      reviewScheduleChanges: [],
      warnings: [],
    }
    expect(maintenanceCuratorFallbackSummary(run)).toContain('Skill graph audit')
    expect(maintenanceCuratorFallbackSummary(run)).toContain('Snapshot')
  })

  it('gates curator on enableMaintenanceCurator unless developer mode', () => {
    const base = createInitialState('Calculus 1')
    expect(shouldRunMaintenanceCurator(base)).toBe(true)
    expect(
      shouldRunMaintenanceCurator({
        ...base,
        preferences: { ...base.preferences!, enableMaintenanceCurator: false },
      }),
    ).toBe(false)
    expect(
      shouldRunMaintenanceCurator({
        ...base,
        preferences: { ...base.preferences!, enableMaintenanceCurator: false },
        developerModeEnabled: true,
      }),
    ).toBe(true)
  })

  it('builds deterministic maintenance insight from run and learner state', () => {
    const state = createInitialState('Calculus 1')
    state.mistakePatterns = {
      chain_miss: {
        tag: 'chain_miss',
        skillIds: ['chain_rule'],
        count: 3,
        lastSeen: new Date().toISOString(),
        note: 'test',
      },
    }
    const run: MaintenanceRun = {
      id: 'm1',
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:01:00.000Z',
      trigger: 'manual',
      jobsRun: ['skill_audit'],
      changesMade: ['Skill graph audit: no issues.'],
      backupsCreated: [],
      skillsUpdated: [],
      memoriesUpdated: [],
      problemBankChanges: [],
      resourceRankChanges: [],
      reviewScheduleChanges: [],
      warnings: [],
    }
    const insight = buildDeterministicMaintenanceInsight(state, run)
    expect(insight.changelog_summary).toContain('Skill graph audit')
    expect(insight.learning_model_bullets?.[0]).toContain('Chain Rule')
  })
})
