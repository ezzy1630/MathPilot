import type { MathPilotState } from './types'

export interface CompressionResult {
  summary: string
  learningModelSummary: string
  attemptsArchived: number
}

/** Summarize older attempts for durable_notes-style compression. */
export function compressAttemptHistory(state: MathPilotState, keepRecent = 25): CompressionResult {
  if (state.attempts.length <= keepRecent) {
    return { summary: '', learningModelSummary: '', attemptsArchived: 0 }
  }

  const archived = state.attempts.slice(keepRecent)
  const bySkill = new Map<string, { correct: number; total: number }>()
  const byMistake = new Map<string, number>()
  for (const attempt of archived) {
    for (const skillId of attempt.skillIds) {
      const row = bySkill.get(skillId) ?? { correct: 0, total: 0 }
      row.total += 1
      if (attempt.correct) row.correct += 1
      bySkill.set(skillId, row)
    }
    for (const tag of attempt.mistakeTags ?? []) {
      byMistake.set(tag, (byMistake.get(tag) ?? 0) + 1)
    }
  }

  const lines = [...bySkill.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(-8)
    .map(([id, stats]) => {
      const name = state.skills[id]?.name ?? id
      return `- ${name}: ${stats.correct}/${stats.total} correct in archived window`
    })

  const mistakeLines = [...byMistake.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag, count]) => `- ${tag}: ${count}× in archived attempts`)

  const summary = [
    `## Compressed attempt history (${new Date().toISOString().slice(0, 10)})`,
    `Archived ${archived.length} attempts; retaining ${keepRecent} recent.`,
    ...lines,
  ].join('\n')

  const learningModelSummary = [
    `## Learning patterns (${new Date().toISOString().slice(0, 10)})`,
    '### Skill performance (archived window)',
    ...(lines.length ? lines : ['- No skill aggregates in archive.']),
    '### Recurring mistakes',
    ...(mistakeLines.length ? mistakeLines : ['- No tagged mistakes in archive.']),
  ].join('\n')

  return { summary, learningModelSummary, attemptsArchived: archived.length }
}

export function applyMemoryCompression(state: MathPilotState): MathPilotState {
  const { summary, learningModelSummary, attemptsArchived } = compressAttemptHistory(state)
  if (!summary) return state

  const memoriesUpdated = [
    `durable_notes compression +${attemptsArchived} attempts`,
    'learning_model.md patterns updated',
  ]
  return {
    ...state,
    attempts: state.attempts.slice(0, 25),
    changelog: [
      `${new Date().toISOString()}: Memory compression archived ${attemptsArchived} attempts; synced learning_model patterns.`,
      ...state.changelog,
    ],
    maintenanceRuns: state.maintenanceRuns?.length
      ? [{ ...state.maintenanceRuns[0], memoriesUpdated }, ...state.maintenanceRuns.slice(1)]
      : state.maintenanceRuns,
    _compressionSummary: summary,
    _learningModelSummary: learningModelSummary,
  } as MathPilotState & { _compressionSummary?: string; _learningModelSummary?: string }
}
