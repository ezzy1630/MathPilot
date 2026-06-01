import { maybeAutoMaintenance } from './maintenance'
import { paceAdjustments, planSession, type SessionPace } from './sessionEngine'
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
}

export function startDailySession(state: MathPilotState, pace: SessionPace = state.sessionPace ?? 'normal'): MathPilotState {
  const plan = planSession(pace)
  const adjustments = paceAdjustments(pace)
  const itemsTargetInPhase = phaseItemTarget(plan.phases[0], plan, adjustments)
  return {
    ...state,
    sessionPace: pace,
    dailySession: {
      pace,
      phases: plan.phases,
      phaseIndex: 0,
      itemsCompletedInPhase: 0,
      itemsTargetInPhase: itemsTargetInPhase,
      startedAt: new Date().toISOString(),
      difficultyBias: adjustments.difficultyBias,
      reviewIntensity: adjustments.reviewIntensity,
      videoPhaseWeight: adjustments.videoPhaseWeight,
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
  const base = Math.max(1, Math.ceil(plan.problemBudget / plan.phases.length))
  if (phase === 'resource_watch') {
    return adjustments.videoPhaseWeight >= 1.2 ? 1 : 1
  }
  if (phase === 'mixed_review') {
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
  return state.dailySession?.difficultyBias ?? paceAdjustments(state.sessionPace ?? 'normal').difficultyBias
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
    const completed = {
      ...state,
      dailySession: undefined,
      sessionsSinceMaintenance,
      changelog: [
        `${new Date().toISOString()}: Daily session (${session.pace}) completed.`,
        ...state.changelog,
      ],
    }
    return maybeAutoMaintenance(completed)
  }

  const plan = planSession(session.pace)
  const adjustments = paceAdjustments(session.pace)
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
    mixed_review: 'Retrieval warm-up / mixed review',
    resource_watch: 'Concept input',
    guided_practice: 'Guided practice',
    independent_practice: 'Independent practice',
    quick_repair: 'Quick repair',
    diagnostic: 'Diagnostic',
    homework_review: 'Homework review',
  }
  return labels[kind] ?? kind.replaceAll('_', ' ')
}

export function phaseContentMode(phase: ActivityKind): ActivityKind {
  const aliases: Partial<Record<ActivityKind, ActivityKind>> = {
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
