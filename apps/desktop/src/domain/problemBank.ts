import type { MathPilotState, Problem } from './types'

export type ProblemVerificationStatus = 'verified' | 'unverified_used' | 'deprecated'

export interface ProblemBankEntry extends Problem {
  verificationStatus: ProblemVerificationStatus
  source: string
  createdAt: string
}

/** Codex-ready metadata per spec §9.2 */
export interface CodexProblemMetadata {
  id: string
  skillIds: string[]
  difficulty: number
  problemType: 'procedural' | 'conceptual' | 'mixed'
  requiresShowWork: boolean
  answerType: Problem['answerType']
  expectedAnswer: string
  verification: {
    symbolic: 'passed' | 'failed' | 'skipped'
    numeric: 'passed' | 'failed' | 'skipped'
  }
  verificationStatus: ProblemVerificationStatus
  source: string
  createdAt: string
}

export function inferProblemType(problem: Problem): CodexProblemMetadata['problemType'] {
  if (problem.answerType === 'choice' || problem.answerType === 'text') return 'conceptual'
  if (problem.mode === 'diagnostic') return 'mixed'
  return 'procedural'
}

export function toCodexMetadata(
  problem: Problem,
  verification: CodexProblemMetadata['verification'] = { symbolic: 'skipped', numeric: 'skipped' },
): CodexProblemMetadata {
  return {
    id: problem.id,
    skillIds: problem.skillIds,
    difficulty: problem.difficulty,
    problemType: inferProblemType(problem),
    requiresShowWork: problem.requiresShowWork ?? false,
    answerType: problem.answerType,
    expectedAnswer: problem.expectedAnswer,
    verification,
    verificationStatus: problem.verificationStatus ?? 'unverified_used',
    source: problem.source ?? 'unknown',
    createdAt: new Date().toISOString(),
  }
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
        verificationStatus: 'deprecated',
      },
    },
    changelog: [`${new Date().toISOString()}: Problem ${problemId} deprecated — ${reason}`, ...state.changelog],
  }
}

export function promoteProblemToVerified(state: MathPilotState, problemId: string): MathPilotState {
  const problem = state.problems[problemId]
  if (!problem || problem.deprecated) return state
  return {
    ...state,
    problems: {
      ...state.problems,
      [problemId]: {
        ...problem,
        verificationStatus: 'verified',
      },
    },
    changelog: [`${new Date().toISOString()}: Problem ${problemId} promoted to verified.`, ...state.changelog],
  }
}

export function markProblemUnverifiedUsed(state: MathPilotState, problemId: string): MathPilotState {
  const problem = state.problems[problemId]
  if (!problem || problem.deprecated) return state
  return {
    ...state,
    problems: {
      ...state.problems,
      [problemId]: {
        ...problem,
        verificationStatus: 'unverified_used',
      },
    },
    changelog: [`${new Date().toISOString()}: Problem ${problemId} marked unverified_used.`, ...state.changelog],
  }
}

export function activeProblems(state: MathPilotState): Problem[] {
  return Object.values(state.problems).filter((p) => !p.deprecated)
}

export function verifiedProblems(state: MathPilotState): Problem[] {
  return activeProblems(state).filter((p) => p.verificationStatus === 'verified')
}
