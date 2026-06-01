import { ensureMemoryLoaded, invokeCodexForTask } from './aiAdapter'
import { parseContinuingDiagnosticCuratorResponse } from './codexParser'
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

  const weakIds = Object.entries(state.mistakePatterns)
    .filter(([, p]) => p.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .flatMap(([, p]) => p.skillIds)
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
    `Mistake patterns: ${Object.keys(state.mistakePatterns).slice(0, 6).join(', ') || 'none'}`,
    'Return JSON only with keys: gap_label (string), coach_narrative (string).',
  ].join(' ')

  const { state: logged, result } = await invokeCodexForTask(state, task, {
    memoryLines: memory,
    skillBodies: skills,
    forceNewSession: true,
  })

  const baseInsight = state.coachInsight ?? buildCoachInsightFallback(state)
  let narrative = baseInsight.narrative

  if (result.ok && result.mode === 'codex_cli') {
    const payload = parseContinuingDiagnosticCuratorResponse(result.stdout)
    if (payload) {
      const nextNarrative = narrativeFromPayload(payload, baseInsight)
      if (nextNarrative) narrative = nextNarrative
    }
  }

  const insight: CoachInsight = {
    ...baseInsight,
    updatedAt: new Date().toISOString(),
    narrative,
    source: result.ok && result.mode === 'codex_cli' ? 'codex' : baseInsight.source,
  }

  return {
    ...logged,
    coachInsight: insight,
    changelog: [
      `${insight.updatedAt}: Continuing diagnostic curator updated coach narrative only.`,
      ...logged.changelog,
    ],
  }
}
