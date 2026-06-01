import type { MathPilotState, Problem } from './types'

export type ProblemVerificationStatus = 'verified' | 'unverified_used' | 'deprecated'

export interface ProblemBankEntry extends Problem {
  verificationStatus: ProblemVerificationStatus
  source: string
  createdAt: string
}

export function problemBankForDiagnostic(state: MathPilotState): Problem[] {
  return Object.values(state.problems).filter(
    (p) => p.mode === 'diagnostic' || p.skillIds.some((id) => state.skills[id]),
  )
}

export function markProblemDeprecated(state: MathPilotState, problemId: string, reason: string): MathPilotState {
  const problem = state.problems[problemId]
  if (!problem) return state
  return {
    ...state,
    problems: {
      ...state.problems,
      [problemId]: {
        ...problem,
        deprecated: true,
        deprecationReason: reason,
      },
    },
    changelog: [`${new Date().toISOString()}: Problem ${problemId} deprecated — ${reason}`, ...state.changelog],
  }
}

export function activeProblems(state: MathPilotState): Problem[] {
  return Object.values(state.problems).filter((p) => !p.deprecated)
}
