import type { AttemptInput, MathPilotState } from './types'

export interface ContinuingDiagnosticTrigger {
  reason: string
  skillIds: string[]
  kind:
    | 'mistake_pattern'
    | 'hint_dependency'
    | 'review_failure'
    | 'homework_mistake'
    | 'confidence_mismatch'
}

const todayIso = () => new Date().toISOString().slice(0, 10)

function activeDiagnostic(state: MathPilotState): boolean {
  return Boolean(state.diagnostic && !state.diagnostic.completed)
}

/** Scan persisted state for continuing-diagnostic triggers (spec §7.4). */
export function shouldTriggerContinuingDiagnostic(
  state: MathPilotState,
): ContinuingDiagnosticTrigger | undefined {
  if (activeDiagnostic(state)) return undefined
  if (!state.onboarded) return undefined

  const recent = state.attempts.slice(0, 20)

  const repeatedMistakes = Object.values(state.mistakePatterns).filter((pattern) => pattern.count >= 3)
  if (repeatedMistakes.length) {
    const top = repeatedMistakes.sort((a, b) => b.count - a.count)[0]
    return {
      kind: 'mistake_pattern',
      reason: `Repeated mistake pattern: ${top.note}`,
      skillIds: top.skillIds.slice(0, 3),
    }
  }

  const hintFailures = recent.filter((a) => !a.correct && a.hintCount >= 2)
  if (hintFailures.length >= 2) {
    const skillIds = [...new Set(hintFailures.flatMap((a) => a.skillIds))].slice(0, 3)
    return {
      kind: 'hint_dependency',
      reason: 'Multiple misses after heavy hint use — check whether the method is understood.',
      skillIds,
    }
  }

  const reviewFailures = recent.filter((a) => a.mode === 'review' && !a.correct)
  if (reviewFailures.length >= 2) {
    const skillIds = [...new Set(reviewFailures.flatMap((a) => a.skillIds))].slice(0, 3)
    return {
      kind: 'review_failure',
      reason: 'Spaced review misses suggest retention gaps.',
      skillIds,
    }
  }

  const homework = state.homeworkAnalyses
    .filter((analysis) => analysis.correctness !== 'correct' && analysis.skillsAffected.length)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (homework?.skillsAffected.length) {
    return {
      kind: 'homework_mistake',
      reason: homework.feedbackSummary || 'Homework analysis flagged skills to re-check.',
      skillIds: homework.skillsAffected.slice(0, 3),
    }
  }

  const overconfidentWrong = recent.filter((a) => a.confidence !== undefined && a.confidence >= 4 && !a.correct)
  if (overconfidentWrong.length >= 2) {
    const skillIds = [...new Set(overconfidentWrong.flatMap((a) => a.skillIds))].slice(0, 3)
    return {
      kind: 'confidence_mismatch',
      reason: 'Overconfident misses — a short diagnostic will recalibrate.',
      skillIds,
    }
  }

  return undefined
}

function triggerFromAttempt(
  state: MathPilotState,
  attempt: AttemptInput,
): ContinuingDiagnosticTrigger | undefined {
  if (activeDiagnostic(state)) return undefined
  if (!state.onboarded) return undefined
  if (state.continuingDiagnosticPending) return undefined

  for (const tag of attempt.mistakeTags ?? []) {
    const pattern = state.mistakePatterns[tag]
    if (pattern && pattern.count >= 3) {
      return {
        kind: 'mistake_pattern',
        reason: `Repeated mistake pattern: ${pattern.note}`,
        skillIds: pattern.skillIds.slice(0, 3),
      }
    }
  }

  if (!attempt.correct && attempt.hintCount >= 2) {
    const hintFailures = state.attempts.filter((a) => !a.correct && a.hintCount >= 2).slice(0, 2)
    if (hintFailures.length >= 2) {
      return {
        kind: 'hint_dependency',
        reason: 'Heavy hint use without success — verify method understanding.',
        skillIds: attempt.skillIds.slice(0, 3),
      }
    }
  }

  if (!attempt.correct && attempt.mode === 'review') {
    const reviewFailures = state.attempts.filter((a) => a.mode === 'review' && !a.correct).slice(0, 2)
    if (reviewFailures.length >= 2) {
      return {
        kind: 'review_failure',
        reason: 'Spaced review misses suggest retention gaps.',
        skillIds: [...new Set(reviewFailures.flatMap((a) => a.skillIds))].slice(0, 3),
      }
    }
  }

  if (
    attempt.mode === 'homework' ||
    (attempt.mistakeTags ?? []).some((tag) => tag.startsWith('homework:'))
  ) {
    const homeworkTags = attempt.mistakeTags?.filter((tag) => tag.includes(':')) ?? []
    if (!attempt.correct && homeworkTags.length) {
      return {
        kind: 'homework_mistake',
        reason: 'Homework mistake pattern needs a quick diagnostic check.',
        skillIds: attempt.skillIds.slice(0, 3),
      }
    }
  }

  if (attempt.confidence !== undefined && attempt.confidence >= 4 && !attempt.correct) {
    return {
      kind: 'confidence_mismatch',
      reason: 'Overconfident miss — recalibrate with a short diagnostic.',
      skillIds: attempt.skillIds.slice(0, 3),
    }
  }

  return shouldTriggerContinuingDiagnostic(state)
}

/**
 * Call after `recordAttempt` (or from App with the same attempt input) to set
 * `continuingDiagnosticPending` when spec §7.4 triggers fire.
 */
export function evaluateContinuingDiagnostic(
  state: MathPilotState,
  attempt: AttemptInput,
): MathPilotState {
  const trigger = triggerFromAttempt(state, attempt)
  if (!trigger) return state

  return {
    ...state,
    continuingDiagnosticPending: true,
    changelog: [
      `${todayIso()}: Continuing diagnostic recommended — ${trigger.reason}`,
      ...state.changelog,
    ],
  }
}

export function clearContinuingDiagnosticPending(state: MathPilotState): MathPilotState {
  if (!state.continuingDiagnosticPending) return state
  return { ...state, continuingDiagnosticPending: false }
}
