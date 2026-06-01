import { maybeAutoMaintenance } from './maintenance'
import { paceAdjustments, planSession, resolvePaceAdjustments, type SessionPace } from './sessionEngine'
import type { ActivityKind, MathPilotState } from './types'

export interface DailySessionState {
  pace: SessionPace
  phases: ActivityKind[]
  phaseIndex: number
  itemsCompletedInPhase: number
  itemsTargetInPhase: number
  startedAt: string
  difficultyBias: number
  reviewIntensity: number
  videoPhaseWeight: number
  explanationLevel: 'minimal' | 'normal' | 'high'
}

export function startDailySession(state: MathPilotState, pace: SessionPace = state.sessionPace ?? 'normal'): MathPilotState {
  const resolvedPace = pace === 'custom' ? 'custom' : pace
  const plan = planSession(resolvedPace, state)
  const adjustments = resolvePaceAdjustments(state, resolvedPace)
  const itemsTargetInPhase = phaseItemTarget(plan.phases[0], plan, adjustments)
  return {
    ...state,
    sessionPace: resolvedPace,
    dailySession: {
      pace: resolvedPace,
      phases: plan.phases,
      phaseIndex: 0,
      itemsCompletedInPhase: 0,
      itemsTargetInPhase,
      startedAt: new Date().toISOString(),
      difficultyBias: adjustments.difficultyBias,
      reviewIntensity: adjustments.reviewIntensity,
      videoPhaseWeight: adjustments.videoPhaseWeight,
      explanationLevel: plan.explanationLevel,
    },
  }
}

export function currentSessionPhase(state: MathPilotState): ActivityKind | undefined {
  return state.dailySession?.phases[state.dailySession.phaseIndex]
}

export function phaseItemTarget(
  phase: ActivityKind,
  plan: ReturnType<typeof planSession>,
  adjustments = paceAdjustments('normal'),
): number {
  const base = Math.max(1, Math.ceil(plan.problemBudget / Math.max(1, plan.phases.length)))
  if (phase === 'resource_watch' || phase === 'concept_input') {
    return adjustments.videoPhaseWeight >= 1.2 ? 1 : 1
  }
  if (phase === 'worked_example') {
    return 1
  }
  if (phase === 'formula_recall') {
    return Math.max(1, Math.round(base * 0.5 * adjustments.reviewIntensity))
  }
  if (phase === 'syllabus_task') {
    return Math.max(1, Math.round(base * 0.85))
  }
  if (phase === 'mixed_review' || phase === 'retrieval_warmup') {
    return Math.max(1, Math.round(base * adjustments.reviewIntensity))
  }
  if (phase === 'quick_repair') {
    return Math.max(1, Math.round(base * 0.75))
  }
  if (phase === 'independent_practice' && adjustments.introduceNewMaterial === false) {
    return Math.max(1, Math.round(base * 0.8))
  }
  return base
}

export function sessionDifficultyBias(state: MathPilotState): number {
  return state.dailySession?.difficultyBias ?? resolvePaceAdjustments(state, state.sessionPace ?? 'normal').difficultyBias
}

export function sessionReviewIntensity(state: MathPilotState): number {
  return state.dailySession?.reviewIntensity ?? resolvePaceAdjustments(state, state.sessionPace ?? 'normal').reviewIntensity
}

export function advanceDailySession(state: MathPilotState): MathPilotState {
  const session = state.dailySession
  if (!session) return state

  const completed = session.itemsCompletedInPhase + 1
  if (completed < session.itemsTargetInPhase) {
    return {
      ...state,
      dailySession: { ...session, itemsCompletedInPhase: completed },
    }
  }

  const nextIndex = session.phaseIndex + 1
  if (nextIndex >= session.phases.length) {
    const sessionsSinceMaintenance = (state.sessionsSinceMaintenance ?? 0) + 1
    const completedState = {
      ...state,
      dailySession: undefined,
      sessionsSinceMaintenance,
      changelog: [
        `${new Date().toISOString()}: Daily session (${session.pace}) completed.`,
        ...state.changelog,
      ],
    }
    return maybeAutoMaintenance(completedState)
  }

  const plan = planSession(session.pace, state)
  const adjustments = resolvePaceAdjustments(state, session.pace)
  const nextPhase = session.phases[nextIndex]

  return {
    ...state,
    dailySession: {
      ...session,
      phaseIndex: nextIndex,
      itemsCompletedInPhase: 0,
      itemsTargetInPhase: phaseItemTarget(nextPhase, plan, adjustments),
    },
  }
}

export function sessionPhaseLabel(kind: ActivityKind): string {
  const labels: Partial<Record<ActivityKind, string>> = {
    retrieval_warmup: 'Retrieval warm-up',
    concept_input: 'Concept input',
    worked_example: 'Worked example',
    mixed_review: 'Mixed review',
    resource_watch: 'Concept input',
    guided_practice: 'Guided practice',
    independent_practice: 'Independent practice',
    quick_repair: 'Quick repair',
    diagnostic: 'Diagnostic',
    homework_review: 'Homework review',
    formula_recall: 'Formula recall',
    syllabus_task: 'Syllabus task',
  }
  return labels[kind] ?? kind.replaceAll('_', ' ')
}

export function phaseContentMode(phase: ActivityKind): ActivityKind {
  const aliases: Partial<Record<ActivityKind, ActivityKind>> = {
    retrieval_warmup: 'mixed_review',
    concept_input: 'resource_watch',
    worked_example: 'guided_practice',
    formula_recall: 'formula_recall',
    syllabus_task: 'guided_practice',
    mixed_review: 'mixed_review',
    resource_watch: 'resource_watch',
    guided_practice: 'guided_practice',
    independent_practice: 'independent_practice',
    quick_repair: 'quick_repair',
    homework_review: 'homework_review',
    diagnostic: 'diagnostic',
  }
  return aliases[phase] ?? phase
}
