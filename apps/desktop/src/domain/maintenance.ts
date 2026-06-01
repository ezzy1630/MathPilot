import { applyMemoryCompression } from './memoryCompression'
import { markProblemDeprecated } from './problemBank'
import { upsertReviewItem } from './reviewScheduler'
import type { MathPilotState } from './types'

export interface MaintenanceRun {
  id: string
  startedAt: string
  endedAt: string
  trigger: string
  jobsRun: string[]
  changesMade: string[]
  backupsCreated: string[]
  skillsUpdated: string[]
  memoriesUpdated: string[]
  problemBankChanges: string[]
  resourceRankChanges: string[]
  reviewScheduleChanges: string[]
  warnings: string[]
}

export function runMaintenance(state: MathPilotState, trigger = 'manual'): MathPilotState {
  const startedAt = new Date().toISOString()
  const jobsRun: string[] = []
  const changesMade: string[] = []
  const warnings: string[] = []
  const problemBankChanges: string[] = []
  const reviewScheduleChanges: string[] = []
  const resourceRankChanges: string[] = []
  const skillsUpdated: string[] = []
  const memoriesUpdated: string[] = []

  let next = state

  jobsRun.push('memory_compression')
  const compressed = applyMemoryCompression(next)
  if (compressed !== next) {
    const summary = (compressed as MathPilotState & { _compressionSummary?: string })._compressionSummary
    if (summary) {
      memoriesUpdated.push('durable_notes.md')
      if (typeof window !== 'undefined' && (window as Window & { __TAURI__?: unknown }).__TAURI__) {
        void import('@tauri-apps/api/core')
          .then(({ invoke }) => invoke('append_memory_file', { filename: 'durable_notes.md', content: summary }))
          .catch(() => warnings.push('Could not append memory compression to durable_notes.md'))
      }
    }
    changesMade.push(`Compressed attempt history; ${compressed.attempts.length} recent attempts retained.`)
    next = compressed
  }

  jobsRun.push('problem_bank_audit')
  for (const problem of Object.values(next.problems)) {
    if (problem.deprecated) continue
    if (problem.verificationStatus === 'unverified_used' && (problem.attemptCount ?? 0) > 8) {
      next = markProblemDeprecated(next, problem.id, 'Heavy use without verification')
      problemBankChanges.push(`Deprecated ${problem.id} after repeated unverified use.`)
    }
  }

  jobsRun.push('review_schedule_audit')
  const today = new Date().toISOString().slice(0, 10)
  let queue = [...next.reviewQueue]
  for (const item of queue) {
    if (item.due < today) {
      queue = upsertReviewItem(queue, {
        ...item,
        priority: Math.min(99, item.priority + 12),
        reason: `${item.reason} (overdue bump)`,
      })
      reviewScheduleChanges.push(`Raised priority for overdue ${item.skillId}.`)
    }
  }
  next = { ...next, reviewQueue: queue }

  jobsRun.push('resource_effectiveness_audit')
  const resources = { ...next.resources }
  for (const resource of Object.values(resources)) {
    if (resource.effectivenessScore < 0.35) {
      resources[resource.id] = {
        ...resource,
        effectivenessScore: Math.max(0.15, resource.effectivenessScore - 0.02),
        notes: 'Demoted by maintenance — low effectiveness.',
      }
      resourceRankChanges.push(`Demoted low-effectiveness resource: ${resource.title}`)
    }
  }
  next = { ...next, resources }

  jobsRun.push('mastery_consistency_audit')
  for (const record of Object.values(next.mastery)) {
    if (record.masteryScore < 0.35 && record.masteryState !== 'Weak' && record.masteryState !== 'Unknown') {
      skillsUpdated.push(record.skillId)
    }
  }
  if (skillsUpdated.length) {
    changesMade.push(`Flagged ${skillsUpdated.length} skills for consistency review.`)
  }

  const backupId = `backup-${Date.now()}`
  const backupPayload = JSON.stringify(next, null, 2)
  jobsRun.push('state_backup')
  changesMade.push(`Snapshot ${backupId} (${Math.round(backupPayload.length / 1024)} KB).`)

  if (typeof window !== 'undefined' && (window as Window & { __TAURI__?: unknown }).__TAURI__) {
    void import('@tauri-apps/api/core')
      .then(({ invoke }) =>
        invoke('write_backup', { backupId, payload: backupPayload }).catch(() => {
          warnings.push('Could not write backup file to disk.')
        }),
      )
      .catch(() => warnings.push('Tauri backup unavailable.'))
  }

  const run: MaintenanceRun = {
    id: `maint-${Date.now()}`,
    startedAt,
    endedAt: new Date().toISOString(),
    trigger,
    jobsRun,
    changesMade,
    backupsCreated: [backupId],
    skillsUpdated,
    memoriesUpdated,
    problemBankChanges,
    resourceRankChanges,
    reviewScheduleChanges,
    warnings,
  }

  return {
    ...next,
    maintenanceRuns: [run, ...(next.maintenanceRuns ?? [])],
    changelog: [
      `${run.endedAt}: Maintenance run (${trigger}) — ${jobsRun.join(', ')}.`,
      ...next.changelog,
    ],
  }
}
