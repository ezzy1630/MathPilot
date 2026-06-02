import type { ActivityKind, MathPilotState, NextAction } from './types'
import type { CodexResponsePayload, CodexStateUpdates } from './codexParser'

const MAX_MASTERY_DELTA = 0.15
const MIN_CONFIDENCE_FOR_CODEX_OVERRIDE = 0.85

const ALLOWED_ACTIVITY_KINDS = new Set<ActivityKind>([
  'diagnostic',
  'quick_repair',
  'guided_practice',
  'independent_practice',
  'mixed_review',
  'resource_watch',
  'homework_review',
  'retrieval_warmup',
  'concept_input',
  'worked_example',
  'formula_recall',
  'syllabus_task',
])

function clampScore(score: number): number {
  return Math.max(0, Math.min(1, score))
}

function isKnownSkill(state: MathPilotState, skillId: string): boolean {
  return Boolean(state.skills[skillId] && state.mastery[skillId])
}

/** Drop mastery mutations for unknown skills and cap deltas from Codex. */
export function sanitizeStateUpdates(
  state: MathPilotState,
  updates: CodexStateUpdates | undefined,
): CodexStateUpdates | undefined {
  if (!updates || typeof updates !== 'object') return undefined

  const sanitized: CodexStateUpdates = {}
  const listIncrease = updates.skills_to_increase
  if (Array.isArray(listIncrease)) {
    const kept = listIncrease
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => {
        const skillId = (entry as { skill_id?: string }).skill_id
        if (!skillId || !isKnownSkill(state, skillId)) return null
        const current = state.mastery[skillId].masteryScore
        const rawDelta = (entry as { delta?: number }).delta
        const delta =
          typeof rawDelta === 'number'
            ? Math.max(-MAX_MASTERY_DELTA, Math.min(MAX_MASTERY_DELTA, rawDelta))
            : 0.08
        const explicit =
          typeof (entry as { masteryScore?: number }).masteryScore === 'number'
            ? (entry as { masteryScore: number }).masteryScore
            : typeof (entry as { mastery_score?: number }).mastery_score === 'number'
              ? (entry as { mastery_score: number }).mastery_score
              : undefined
        const masteryScore =
          explicit !== undefined
            ? clampScore(Math.min(current + MAX_MASTERY_DELTA, Math.max(current - MAX_MASTERY_DELTA, explicit)))
            : clampScore(current + delta)
        return { skill_id: skillId, masteryScore }
      })
      .filter(Boolean) as NonNullable<CodexStateUpdates['skills_to_increase']>
    if (kept.length) sanitized.skills_to_increase = kept
  }

  const decrease = (updates.skills_to_decrease ?? []).filter((id) => isKnownSkill(state, id))
  if (decrease.length) sanitized.skills_to_decrease = decrease

  const review = [...(updates.skills_to_review ?? []), ...(updates.skills_to_boost ?? [])].filter((id) =>
    isKnownSkill(state, id),
  )
  if (review.length) sanitized.skills_to_review = [...new Set(review)]

  for (const [skillId, raw] of Object.entries(updates)) {
    if (
      skillId === 'skills_to_increase' ||
      skillId === 'skills_to_decrease' ||
      skillId === 'skills_to_review' ||
      skillId === 'skills_to_boost'
    ) {
      continue
    }
    if (!isKnownSkill(state, skillId) || typeof raw !== 'object' || raw === null) continue
    const patch = raw as Record<string, unknown>
    const current = state.mastery[skillId].masteryScore
    const score =
      typeof patch.masteryScore === 'number'
        ? clampScore(Math.min(current + MAX_MASTERY_DELTA, Math.max(current - MAX_MASTERY_DELTA, patch.masteryScore)))
        : typeof patch.mastery_score === 'number'
          ? clampScore(
              Math.min(current + MAX_MASTERY_DELTA, Math.max(current - MAX_MASTERY_DELTA, patch.mastery_score)),
            )
          : current
    sanitized[skillId] = {
      masteryScore: score,
      masteryState:
        typeof patch.masteryState === 'string' ? patch.masteryState : state.mastery[skillId].masteryState,
    }
  }

  return Object.keys(sanitized).length ? sanitized : undefined
}

export function sanitizeRecommendedNextAction(
  state: MathPilotState,
  action: Partial<NextAction> | undefined,
): Partial<NextAction> | undefined {
  if (!action || typeof action !== 'object') return undefined
  const kind = action.kind
  if (!kind || !ALLOWED_ACTIVITY_KINDS.has(kind)) return undefined
  const skillIds = (action.skillIds ?? []).filter((id) => isKnownSkill(state, id))
  if (!skillIds.length && action.problemId && !state.problems[action.problemId]) {
    return undefined
  }
  return {
    ...action,
    skillIds: skillIds.length ? skillIds : action.skillIds?.filter((id) => state.skills[id]) ?? [],
    title: typeof action.title === 'string' ? action.title.slice(0, 120) : undefined,
    reason: typeof action.reason === 'string' ? action.reason.slice(0, 400) : undefined,
    cta: typeof action.cta === 'string' ? action.cta.slice(0, 80) : undefined,
  }
}

/** Strip unsafe fields before applying tutor/help Codex payloads to local state. */
export function sanitizeCodexResponse(
  state: MathPilotState,
  payload: CodexResponsePayload,
): CodexResponsePayload {
  const mistake_tags = payload.mistake_tags
    ?.filter((tag) => typeof tag === 'string' && tag.length > 0 && tag.length < 120)
    .slice(0, 12)

  return {
    feedback_to_user:
      typeof payload.feedback_to_user === 'string' ? payload.feedback_to_user.slice(0, 4000) : undefined,
    mistake_tags,
    state_updates: sanitizeStateUpdates(state, payload.state_updates),
    recommended_next_action: sanitizeRecommendedNextAction(state, payload.recommended_next_action),
    answer_is_correct:
      typeof payload.answer_is_correct === 'boolean' ? payload.answer_is_correct : undefined,
  }
}

export function filterKnownSkillIds(state: MathPilotState, skillIds: string[]): string[] {
  return skillIds.filter((id) => Boolean(state.skills[id]))
}

export function codexInspectConfidenceAllowsOverride(confidence: number | undefined): boolean {
  if (confidence === undefined) return false
  return confidence >= MIN_CONFIDENCE_FOR_CODEX_OVERRIDE
}
