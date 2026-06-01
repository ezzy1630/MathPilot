import type { MathPilotState } from './types'

export interface CompressionResult {
  summary: string
  attemptsArchived: number
}

/** Summarize older attempts for durable_notes-style compression. */
export function compressAttemptHistory(state: MathPilotState, keepRecent = 25): CompressionResult {
  if (state.attempts.length <= keepRecent) {
    return { summary: '', attemptsArchived: 0 }
  }

  const archived = state.attempts.slice(keepRecent)
  const bySkill = new Map<string, { correct: number; total: number }>()
  for (const attempt of archived) {
    for (const skillId of attempt.skillIds) {
      const row = bySkill.get(skillId) ?? { correct: 0, total: 0 }
      row.total += 1
      if (attempt.correct) row.correct += 1
      bySkill.set(skillId, row)
    }
  }

  const lines = [...bySkill.entries()]
    .sort((a, b) => a[1].total - b[1].total)
    .slice(-8)
    .map(([id, stats]) => {
      const name = state.skills[id]?.name ?? id
      return `- ${name}: ${stats.correct}/${stats.total} correct in archived window`
    })

  const summary = [
    `## Compressed attempt history (${new Date().toISOString().slice(0, 10)})`,
    `Archived ${archived.length} attempts; retaining ${keepRecent} recent.`,
    ...lines,
  ].join('\n')

  return { summary, attemptsArchived: archived.length }
}

export function applyMemoryCompression(state: MathPilotState): MathPilotState {
  const { summary, attemptsArchived } = compressAttemptHistory(state)
  if (!summary) return state

  const memoriesUpdated = [`durable_notes compression +${attemptsArchived} attempts`]
  return {
    ...state,
    attempts: state.attempts.slice(0, 25),
    changelog: [
      `${new Date().toISOString()}: Memory compression archived ${attemptsArchived} attempts.`,
      ...state.changelog,
    ],
    maintenanceRuns: state.maintenanceRuns?.length
      ? [{ ...state.maintenanceRuns[0], memoriesUpdated }, ...state.maintenanceRuns.slice(1)]
      : state.maintenanceRuns,
    _compressionSummary: summary,
  } as MathPilotState & { _compressionSummary?: string }
}
