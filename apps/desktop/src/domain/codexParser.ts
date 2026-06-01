import type { MathPilotState, NextAction } from './types'

export interface CodexResponsePayload {
  feedback_to_user?: string
  mistake_tags?: string[]
  state_updates?: CodexStateUpdates
  recommended_next_action?: Partial<NextAction>
  answer_is_correct?: boolean
}

export interface CodexStateUpdates {
  skills_to_increase?: Array<{ skill_id: string; delta?: number; masteryScore?: number; mastery_score?: number }>
  skills_to_decrease?: string[]
  skills_to_review?: string[]
  skills_to_boost?: string[]
  [skillId: string]: unknown
}

export function parseCodexResponse(stdout: string): CodexResponsePayload | null {
  const trimmed = stdout.trim()
  if (!trimmed) return null

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    return JSON.parse(jsonMatch[0]) as CodexResponsePayload
  } catch {
    return null
  }
}

export function applyCodexResponse(state: MathPilotState, payload: CodexResponsePayload): MathPilotState {
  const next: MathPilotState = { ...state, mastery: { ...state.mastery }, mistakePatterns: { ...state.mistakePatterns } }
  if (payload.mistake_tags?.length) {
    for (const tag of payload.mistake_tags) {
      const existing = next.mistakePatterns[tag]
      next.mistakePatterns[tag] = {
        tag,
        skillIds: existing?.skillIds ?? [],
        count: (existing?.count ?? 0) + 1,
        lastSeen: new Date().toISOString(),
        note: payload.feedback_to_user?.slice(0, 200) ?? existing?.note ?? '',
      }
    }
  }

  const updates = payload.state_updates
  if (updates && typeof updates === 'object') {
    const listIncrease = updates.skills_to_increase
    if (Array.isArray(listIncrease)) {
      for (const entry of listIncrease) {
        if (!entry || typeof entry !== 'object') continue
        const skillId = (entry as { skill_id?: string }).skill_id
        if (!skillId || !next.mastery[skillId]) continue
        const current = next.mastery[skillId]
        const delta = (entry as { delta?: number }).delta ?? 0.08
        const score =
          typeof (entry as { masteryScore?: number }).masteryScore === 'number'
            ? (entry as { masteryScore: number }).masteryScore
            : typeof (entry as { mastery_score?: number }).mastery_score === 'number'
              ? (entry as { mastery_score: number }).mastery_score
              : Math.min(1, current.masteryScore + delta)
        next.mastery[skillId] = { ...current, masteryScore: Math.max(0, Math.min(1, score)) }
      }
    }

    for (const skillId of updates.skills_to_decrease ?? []) {
      const current = next.mastery[skillId]
      if (!current) continue
      next.mastery[skillId] = { ...current, masteryScore: Math.max(0.08, current.masteryScore - 0.12) }
    }

    for (const skillId of [...(updates.skills_to_review ?? []), ...(updates.skills_to_boost ?? [])]) {
      const current = next.mastery[skillId]
      if (!current) continue
      next.mastery[skillId] = {
        ...current,
        reviewDue: new Date().toISOString().slice(0, 10),
        masteryState: 'Needs Review',
      }
    }

    for (const [skillId, raw] of Object.entries(updates)) {
      if (
        skillId === 'skills_to_increase' ||
        skillId === 'skills_to_decrease' ||
        skillId === 'skills_to_review' ||
        skillId === 'skills_to_boost'
      ) {
        continue
      }
      const current = next.mastery[skillId]
      if (!current || typeof raw !== 'object' || raw === null) continue
      const patch = raw as Record<string, unknown>
      const score =
        typeof patch.masteryScore === 'number'
          ? patch.masteryScore
          : typeof patch.mastery_score === 'number'
            ? patch.mastery_score
            : current.masteryScore
      next.mastery[skillId] = {
        ...current,
        masteryScore: Math.max(0, Math.min(1, score)),
        masteryState:
          typeof patch.masteryState === 'string'
            ? (patch.masteryState as typeof current.masteryState)
            : current.masteryState,
      }
    }
  }

  return {
    ...next,
    codexHint: payload.recommended_next_action ?? next.codexHint,
    pendingCodexAnswer:
      typeof payload.answer_is_correct === 'boolean'
        ? { correct: payload.answer_is_correct, feedback: payload.feedback_to_user }
        : next.pendingCodexAnswer,
    changelog: [
      `${new Date().toISOString()}: Codex response applied${payload.recommended_next_action ? ' (next action hint)' : ''}${payload.feedback_to_user ? '' : ' (no feedback text)'}.`,
      ...next.changelog,
    ],
  }
}
