import { ensureMemoryLoaded, invokeCodexForTask } from './aiAdapter'
import { withCuratorCodexNotice } from './codexConfig'
import { parseContinuingDiagnosticCuratorResponse } from './codexParser'
import { buildLearnerSnapshot, topMistakeSkillIds } from './curatorContext'
import { buildCoachInsightFallback } from './diagnosticCurator'
import { loadSkillsForPrompt } from './skillLoader'
import type { CoachInsight, MathPilotState } from './types'

export function shouldScheduleContinuingDiagnosticCurator(
  prev: MathPilotState,
  next: MathPilotState,
): boolean {
  return Boolean(
    next.continuingDiagnosticPending &&
      !prev.continuingDiagnosticPending &&
      !next.continuingDiagnosticCuratorRan,
  )
}

export function markContinuingDiagnosticCuratorScheduled(state: MathPilotState): MathPilotState {
  return { ...state, continuingDiagnosticCuratorRan: true }
}

function continuingDiagnosticFallbackNarrative(state: MathPilotState): string {
  const top = Object.values(state.mistakePatterns).sort((a, b) => b.count - a.count)[0]
  if (!top) return 'Recent work suggests a quick calibration check before continuing.'
  const skills = top.skillIds.map((id) => state.skills[id]?.name).filter(Boolean).join(', ')
  return `Recurring ${top.tag.replace(/_/g, ' ')} (${top.count}×)${skills ? ` on ${skills}` : ''} — a short continuing diagnostic will refine your map.`
}

function narrativeFromPayload(
  payload: NonNullable<ReturnType<typeof parseContinuingDiagnosticCuratorResponse>>,
  existing?: CoachInsight,
): string {
  const narrative = payload.coach_narrative?.trim()
  if (narrative) return narrative
  const gap = payload.gap_label?.trim()
  if (gap) {
    return existing?.narrative
      ? `${existing.narrative} Continuing diagnostic focus: ${gap}.`
      : `Continuing diagnostic focus: ${gap}.`
  }
  return existing?.narrative ?? ''
}

export async function runContinuingDiagnosticCurator(state: MathPilotState): Promise<MathPilotState> {
  if (!state.continuingDiagnosticPending) return state

  const weakIds = topMistakeSkillIds(state, 8)
  const recentAttempts = state.attempts.slice(0, 8).map((a) => ({
    correct: a.correct,
    skills: a.skillIds.join(','),
    hints: a.hintCount,
    mode: a.mode,
  }))

  const memory = await ensureMemoryLoaded()
  const skills = await loadSkillsForPrompt('continuing_diagnostic_curator', weakIds.slice(0, 8))
  const task = [
    'continuing_diagnostic_curator',
    'Label the most important knowledge gap for a short continuing diagnostic. Do not change routing or session plans.',
    `Recent attempts: ${JSON.stringify(recentAttempts)}`,
    `Mistake patterns: ${Object.entries(state.mistakePatterns)
      .slice(0, 6)
      .map(([tag, p]) => `${tag}(${p.count})`)
      .join(', ') || 'none'}`,
    `Learner snapshot:\n${buildLearnerSnapshot(state)}`,
    'Return JSON only with keys: gap_label (string), coach_narrative (string).',
  ].join(' ')

  const { state: logged, result } = await invokeCodexForTask(state, task, {
    memoryLines: memory,
    skillBodies: skills,
    forceNewSession: true,
  })

  const baseInsight = state.coachInsight ?? buildCoachInsightFallback(state)
  let narrative = continuingDiagnosticFallbackNarrative(state)

  let working: MathPilotState
  if (result.ok && result.mode === 'codex_cli') {
    const payload = parseContinuingDiagnosticCuratorResponse(result.stdout)
    working = withCuratorCodexNotice(logged, 'Continuing diagnostic curator', result, Boolean(payload))
    if (payload) {
      const nextNarrative = narrativeFromPayload(payload, baseInsight)
      if (nextNarrative) narrative = nextNarrative
    }
  } else {
    working = withCuratorCodexNotice(logged, 'Continuing diagnostic curator', result, true)
    if (baseInsight.narrative) narrative = baseInsight.narrative
  }

  const insight: CoachInsight = {
    ...baseInsight,
    updatedAt: new Date().toISOString(),
    narrative,
    mapHighlightSkillIds: weakIds.length ? weakIds.slice(0, 4) : baseInsight.mapHighlightSkillIds,
    source: result.ok && result.mode === 'codex_cli' ? 'codex' : baseInsight.source,
  }

  return {
    ...working,
    coachInsight: insight,
    changelog: [
      `${insight.updatedAt}: Continuing diagnostic curator updated coach narrative only.`,
      ...working.changelog,
    ],
  }
}
