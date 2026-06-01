import { describe, expect, it } from 'vitest'
import { maintenanceCuratorFallbackSummary, shouldRunMaintenanceCurator } from './maintenanceCurator'
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
})
