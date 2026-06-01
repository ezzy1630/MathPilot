import { planSession, type SessionPace } from './sessionEngine'
import type { ActivityKind, MathPilotState } from './types'

export interface DailySessionState {
  pace: SessionPace
  phases: ActivityKind[]
  phaseIndex: number
  itemsCompletedInPhase: number
  itemsTargetInPhase: number
  startedAt: string
}

export function startDailySession(state: MathPilotState, pace: SessionPace = state.sessionPace ?? 'normal'): MathPilotState {
  const plan = planSession(pace)
  const itemsTargetInPhase = Math.max(1, Math.ceil(plan.problemBudget / plan.phases.length))
  return {
    ...state,
    sessionPace: pace,
    dailySession: {
      pace,
      phases: plan.phases,
      phaseIndex: 0,
      itemsCompletedInPhase: 0,
      itemsTargetInPhase,
      startedAt: new Date().toISOString(),
    },
  }
}

export function currentSessionPhase(state: MathPilotState): ActivityKind | undefined {
  return state.dailySession?.phases[state.dailySession.phaseIndex]
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
    return {
      ...state,
      dailySession: undefined,
      changelog: [
        `${new Date().toISOString()}: Daily session (${session.pace}) completed.`,
        ...state.changelog,
      ],
    }
  }

  return {
    ...state,
    dailySession: {
      ...session,
      phaseIndex: nextIndex,
      itemsCompletedInPhase: 0,
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
  }
  return labels[kind] ?? kind.replaceAll('_', ' ')
}
