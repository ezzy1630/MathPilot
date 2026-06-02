import { extractJsonObject } from './codexJson'
import { sanitizeCodexResponse } from './codexTrust'
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

export interface DiagnosticCuratorPayload {
  knowledge_gaps?: string[]
  coach_narrative?: string
  learning_model_bullets?: string[]
  map_highlight_skill_ids?: string[]
}

export interface MaintenanceCuratorPayload {
  changelog_summary?: string
  learning_model_bullets?: string[]
  durable_notes_bullets?: string[]
  warnings?: string[]
  coach_narrative?: string
}

export interface ContinuingDiagnosticCuratorPayload {
  gap_label?: string
  coach_narrative?: string
}

export interface HomeworkClusterPayload {
  clustered_patterns?: Array<{
    tag: string
    skill_ids?: string[]
    note?: string
    count?: number
  }>
  repair_recommendations?: Array<{
    analysis_id?: string
    skill_id: string
    reason: string
  }>
}

export interface HomeworkCodexPayload {
  problemText: string
  extractedWorkSummary: string
  detectedTopic: string
  correctness: 'correct' | 'incorrect' | 'unclear'
  mistakeTags: string[]
  skillsAffected: string[]
  feedbackSummary: string
  steps?: Array<{ label: string; work: string; correct: boolean; note?: string }>
  wrongStepIndex?: number
  detectedProblems?: Array<{
    label: string
    problemText: string
    correctness: 'correct' | 'incorrect' | 'unclear'
    mistakeTags: string[]
  }>
  stepFeedback?: Array<{ step: string; correct: boolean; note: string; index?: number }>
}

export interface CodexInspectPayload {
  resolution?: 'symbolic' | 'codex' | 'symbolic_preferred'
  correct?: boolean
  feedback_to_user?: string
  confidence?: number
}

export function parseCodexResponse(stdout: string): CodexResponsePayload | null {
  const parsed = extractJsonObject(stdout)
  if (!parsed) return null
  return parsed as CodexResponsePayload
}

export function parseCodexInspectResponse(stdout: string): CodexInspectPayload | null {
  const parsed = extractJsonObject(stdout)
  if (!parsed) return null
  const resolution = parsed.resolution
  const validResolution =
    resolution === 'symbolic' || resolution === 'codex' || resolution === 'symbolic_preferred'
      ? resolution
      : undefined
  if (!validResolution && typeof parsed.correct !== 'boolean') return null
  return {
    resolution: validResolution,
    correct: typeof parsed.correct === 'boolean' ? parsed.correct : undefined,
    feedback_to_user:
      typeof parsed.feedback_to_user === 'string' ? parsed.feedback_to_user : undefined,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
  }
}

export function parseHomeworkCodexResponse(stdout: string): HomeworkCodexPayload | null {
  const parsed = extractJsonObject(stdout)
  if (!parsed) return null

  const correctness = String(parsed.correctness ?? 'unclear')
  const validCorrectness = ['correct', 'incorrect', 'unclear'].includes(correctness)
    ? (correctness as HomeworkCodexPayload['correctness'])
    : 'unclear'

  const problemText = String(parsed.problem_text ?? parsed.problemText ?? parsed.feedback_to_user ?? '').trim()
  if (!problemText) return null

  const steps = Array.isArray(parsed.steps)
    ? parsed.steps
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map((row, index) => ({
          label: String(row.label ?? row.step ?? `Step ${index + 1}`),
          work: String(row.work ?? row.note ?? ''),
          correct: Boolean(row.correct),
          note: row.note ? String(row.note) : undefined,
        }))
    : undefined

  const wrongStepIndex =
    typeof parsed.wrong_step_index === 'number'
      ? parsed.wrong_step_index
      : typeof parsed.wrongStepIndex === 'number'
        ? parsed.wrongStepIndex
        : undefined

  const parseProblems = (raw: unknown) => {
    if (!Array.isArray(raw)) return undefined
    return raw
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null
        const row = item as Record<string, unknown>
        const c = String(row.correctness ?? 'unclear')
        const valid = ['correct', 'incorrect', 'unclear'].includes(c)
          ? (c as HomeworkCodexPayload['correctness'])
          : 'unclear'
        const text = String(row.problem_text ?? row.problemText ?? '').trim()
        if (!text) return null
        return {
          label: String(row.label ?? `Problem ${index + 1}`),
          problemText: text,
          correctness: valid,
          mistakeTags: Array.isArray(row.mistake_tags)
            ? (row.mistake_tags as string[]).filter((t) => typeof t === 'string')
            : [],
        }
      })
      .filter(Boolean) as NonNullable<HomeworkCodexPayload['detectedProblems']>
  }

  const stepFeedback = Array.isArray(parsed.step_feedback)
    ? parsed.step_feedback
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        .map((row, index) => ({
          step: String(row.step ?? `Step ${index + 1}`),
          correct: Boolean(row.correct),
          note: String(row.note ?? ''),
          index: typeof row.index === 'number' ? row.index : index,
        }))
    : undefined

  return {
    problemText,
    extractedWorkSummary: String(
      parsed.extracted_work_summary ?? parsed.extractedWorkSummary ?? parsed.feedback_to_user ?? '',
    ),
    detectedTopic: String(parsed.detected_topic ?? parsed.detectedTopic ?? 'Calculus work'),
    correctness: validCorrectness,
    mistakeTags: Array.isArray(parsed.mistake_tags)
      ? (parsed.mistake_tags as string[]).filter((t) => typeof t === 'string').slice(0, 24)
      : [],
    skillsAffected: Array.isArray(parsed.skills_affected)
      ? (parsed.skills_affected as string[]).filter((t) => typeof t === 'string').slice(0, 12)
      : [],
    feedbackSummary: String(parsed.feedback_summary ?? parsed.feedback_to_user ?? ''),
    steps,
    wrongStepIndex,
    detectedProblems: parseProblems(parsed.problems) ?? parseProblems(parsed.detected_problems),
    stepFeedback,
  }
}

export function parseDiagnosticCuratorResponse(stdout: string): DiagnosticCuratorPayload | null {
  const parsed = extractJsonObject(stdout)
  if (!parsed) return null

  const knowledge_gaps = Array.isArray(parsed.knowledge_gaps)
    ? parsed.knowledge_gaps.filter((v): v is string => typeof v === 'string')
    : undefined
  const learning_model_bullets = Array.isArray(parsed.learning_model_bullets)
    ? parsed.learning_model_bullets.filter((v): v is string => typeof v === 'string')
    : undefined
  const map_highlight_skill_ids = Array.isArray(parsed.map_highlight_skill_ids)
    ? parsed.map_highlight_skill_ids.filter((v): v is string => typeof v === 'string')
    : undefined
  const coach_narrative =
    typeof parsed.coach_narrative === 'string' ? parsed.coach_narrative : undefined

  if (!coach_narrative?.trim() && !knowledge_gaps?.length) return null

  return {
    knowledge_gaps,
    coach_narrative,
    learning_model_bullets,
    map_highlight_skill_ids,
  }
}

function stringArrayField(parsed: Record<string, unknown>, key: string): string[] | undefined {
  const raw = parsed[key]
  if (!Array.isArray(raw)) return undefined
  return raw.filter((v): v is string => typeof v === 'string')
}

export function parseMaintenanceCuratorResponse(stdout: string): MaintenanceCuratorPayload | null {
  const parsed = extractJsonObject(stdout)
  if (!parsed) return null

  const changelog_summary =
    typeof parsed.changelog_summary === 'string' ? parsed.changelog_summary : undefined
  const learning_model_bullets = stringArrayField(parsed, 'learning_model_bullets')
  const durable_notes_bullets = stringArrayField(parsed, 'durable_notes_bullets')
  const warnings = stringArrayField(parsed, 'warnings')
  const coach_narrative =
    typeof parsed.coach_narrative === 'string' ? parsed.coach_narrative : undefined

  if (
    !changelog_summary?.trim() &&
    !learning_model_bullets?.length &&
    !durable_notes_bullets?.length &&
    !warnings?.length &&
    !coach_narrative?.trim()
  ) {
    return null
  }

  return { changelog_summary, learning_model_bullets, durable_notes_bullets, warnings, coach_narrative }
}

export function parseContinuingDiagnosticCuratorResponse(
  stdout: string,
): ContinuingDiagnosticCuratorPayload | null {
  const parsed = extractJsonObject(stdout)
  if (!parsed) return null

  const gap_label = typeof parsed.gap_label === 'string' ? parsed.gap_label : undefined
  const coach_narrative =
    typeof parsed.coach_narrative === 'string'
      ? parsed.coach_narrative
      : typeof parsed.narrative === 'string'
        ? parsed.narrative
        : undefined

  if (!gap_label?.trim() && !coach_narrative?.trim()) return null

  return { gap_label, coach_narrative }
}

export function parseHomeworkClusterResponse(stdout: string): HomeworkClusterPayload | null {
  const parsed = extractJsonObject(stdout)
  if (!parsed) return null

  const clustered_patterns = Array.isArray(parsed.clustered_patterns)
    ? parsed.clustered_patterns
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
        .map((entry) => ({
          tag: typeof entry.tag === 'string' ? entry.tag : '',
          skill_ids: Array.isArray(entry.skill_ids)
            ? entry.skill_ids.filter((v): v is string => typeof v === 'string')
            : undefined,
          note: typeof entry.note === 'string' ? entry.note : undefined,
          count: typeof entry.count === 'number' ? entry.count : undefined,
        }))
        .filter((p) => p.tag.trim())
    : undefined

  const repair_recommendations = Array.isArray(parsed.repair_recommendations)
    ? parsed.repair_recommendations
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
        .map((entry) => ({
          analysis_id: typeof entry.analysis_id === 'string' ? entry.analysis_id : undefined,
          skill_id:
            typeof entry.skill_id === 'string'
              ? entry.skill_id
              : typeof entry.skillId === 'string'
                ? entry.skillId
                : '',
          reason: typeof entry.reason === 'string' ? entry.reason : '',
        }))
        .filter((r) => r.skill_id.trim() && r.reason.trim())
    : undefined

  if (!clustered_patterns?.length && !repair_recommendations?.length) return null

  return { clustered_patterns, repair_recommendations }
}

export function applyCodexResponse(state: MathPilotState, payload: CodexResponsePayload): MathPilotState {
  const safe = sanitizeCodexResponse(state, payload)
  const next: MathPilotState = { ...state, mastery: { ...state.mastery }, mistakePatterns: { ...state.mistakePatterns } }
  if (safe.mistake_tags?.length) {
    for (const tag of safe.mistake_tags) {
      const existing = next.mistakePatterns[tag]
      next.mistakePatterns[tag] = {
        tag,
        skillIds: existing?.skillIds ?? [],
        count: (existing?.count ?? 0) + 1,
        lastSeen: new Date().toISOString(),
        note: safe.feedback_to_user?.slice(0, 200) ?? existing?.note ?? '',
      }
    }
  }

  const updates = safe.state_updates
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

  const hintAction = safe.recommended_next_action
  const hintReason =
    hintAction?.reason ?? safe.feedback_to_user?.slice(0, 280) ?? next.codexHint?.reason

  return {
    ...next,
    codexHint: hintReason
      ? {
          ...next.codexHint,
          ...hintAction,
          reason: hintReason,
        }
      : next.codexHint,
    pendingCodexAnswer:
      typeof safe.answer_is_correct === 'boolean'
        ? { correct: safe.answer_is_correct, feedback: safe.feedback_to_user }
        : next.pendingCodexAnswer,
    changelog: [
      `${new Date().toISOString()}: Codex response applied${hintAction ? ' (next action hint)' : ''}${safe.feedback_to_user ? '' : ' (no feedback text)'}.`,
      ...next.changelog,
    ],
  }
}
