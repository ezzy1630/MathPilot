import { currentSessionPhase } from './dailySessionEngine'
import { generateProblemForSkill } from './problemGenerator'
import { pickInterleavedProblem } from './interleavingEngine'
import { buildReviewProblem, inferReviewType } from './reviewItemEngine'
import { problemForSkill } from '../lib/mapHelpers'
import type { ActivityKind, MathPilotState } from './types'

const PHASE_TO_MODE: Partial<Record<ActivityKind, string>> = {
  mixed_review: 'mixed_review',
  guided_practice: 'guided_practice',
  independent_practice: 'independent_practice',
  quick_repair: 'quick_repair',
  resource_watch: 'guided_practice',
}

export function resolveProblemForAction(
  state: MathPilotState,
  skillIds: string[],
  actionKind: ActivityKind,
  explicitProblemId?: string,
): { state: MathPilotState; problemId?: string } {
  if (explicitProblemId && state.problems[explicitProblemId]) {
    return { state, problemId: explicitProblemId }
  }

  const skillId = skillIds[0]
  if (!skillId) return { state }

  const phase = currentSessionPhase(state) ?? actionKind
  const preferredMode = PHASE_TO_MODE[phase] ?? PHASE_TO_MODE[actionKind]

  if (phase === 'mixed_review' || actionKind === 'mixed_review') {
    const reviewType = inferReviewType(state, skillId)
    const built = buildReviewProblem(state, skillId, reviewType, Date.now())
    if (built.problem) return { state: built.state, problemId: built.problem.id }
    const interleaved = pickInterleavedProblem(state, skillId)
    if (interleaved) return { state, problemId: interleaved.id }
  }

  if (phase === 'independent_practice' || actionKind === 'independent_practice') {
    const interleaved = pickInterleavedProblem(state, skillId)
    if (interleaved) return { state, problemId: interleaved.id }
  }

  if (phase === 'resource_watch') {
    return { state, problemId: problemForSkill(state, skillId, 'guided_practice') }
  }

  let existing = problemForSkill(state, skillId, preferredMode)
  if (existing) return { state, problemId: existing }

  const generated = generateProblemForSkill(state, skillId)
  if (generated) {
    return { state: generated.state, problemId: generated.record.problem.id }
  }

  existing = problemForSkill(state, skillId)
  return { state, problemId: existing }
}
