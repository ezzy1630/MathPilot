import { applyMemoryCompression } from './memoryCompression'
import { markProblemDeprecated } from './problemBank'
import { upsertReviewItem } from './reviewScheduler'
import { masteryState } from './learningEngine'
import type { MathPilotState, Skill } from './types'

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

const AUTO_MAINTENANCE_SESSION_THRESHOLD = 3

function collectPrereqPathDuplicates(skills: Record<string, Skill>): string[] {
  const issues: string[] = []
  for (const skill of Object.values(skills)) {
    const prereqs = skill.prerequisites ?? []
    const seen = new Set<string>()
    for (const pre of prereqs) {
      if (seen.has(pre)) {
        issues.push(`Duplicate prerequisite "${pre}" on skill ${skill.id}`)
      }
      seen.add(pre)
    }
    const visit = (id: string, path: string[]): void => {
      if (path.includes(id)) {
        issues.push(`Cycle or repeated id "${id}" in path for ${skill.id}: ${path.join(' → ')}`)
        return
      }
      const node = skills[id]
      if (!node) return
      for (const p of node.prerequisites ?? []) {
        visit(p, [...path, p])
      }
    }
    for (const pre of prereqs) visit(pre, [skill.id, pre])
  }
  return issues
}

function skillImprovementRecommendations(state: MathPilotState): string[] {
  const recs: string[] = []
  for (const record of Object.values(state.mastery)) {
    if (record.masteryScore < 0.45 && record.recentFailures >= 2) {
      const name = state.skills[record.skillId]?.name ?? record.skillId
      recs.push(`Consider patching teach/grade skills for ${name} — repeated failures (${record.recentFailures}).`)
    }
  }
  for (const pattern of Object.values(state.mistakePatterns).slice(0, 8)) {
    if (pattern.count >= 4) {
      recs.push(`Mistake pattern "${pattern.tag}" (${pattern.count}×) — review classify_mistake / quick repair skills.`)
    }
  }
  return recs
}

export function maybeAutoMaintenance(state: MathPilotState): MathPilotState {
  const count = state.sessionsSinceMaintenance ?? 0
  if (count < AUTO_MAINTENANCE_SESSION_THRESHOLD) return state
  const next = runMaintenance(state, 'auto_after_sessions')
  return { ...next, sessionsSinceMaintenance: 0 }
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

  jobsRun.push('skill_audit')
  const skillIssues = collectPrereqPathDuplicates(next.skills)
  if (skillIssues.length) {
    warnings.push(...skillIssues)
    changesMade.push(`Skill graph audit: ${skillIssues.length} issue(s) logged.`)
  } else {
    changesMade.push('Skill graph audit: no duplicate ids in prerequisite paths.')
  }

  jobsRun.push('skill_improvement')
  const recommendations = skillImprovementRecommendations(next)
  for (const rec of recommendations) {
    changesMade.push(`Recommendation: ${rec}`)
  }
  if (!recommendations.length) {
    changesMade.push('Skill improvement: no high-priority patches suggested.')
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
  const mastery = { ...next.mastery }
  for (const record of Object.values(mastery)) {
    const expected = masteryState(record.masteryScore, record.reviewDue, {
      delayedMixedCorrect: record.delayedMixedCorrect,
    })
    const inconsistent =
      (record.masteryScore < 0.35 && record.masteryState !== 'Weak' && record.masteryState !== 'Unknown') ||
      record.masteryState !== expected
    if (inconsistent) {
      mastery[record.skillId] = {
        ...record,
        masteryState: record.masteryScore < 0.35 ? 'Weak' : expected,
      }
      skillsUpdated.push(record.skillId)
    }
  }
  if (skillsUpdated.length) {
    changesMade.push(`Fixed mastery state for ${skillsUpdated.length} skill(s).`)
    next = { ...next, mastery }
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
