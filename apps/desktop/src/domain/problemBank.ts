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

export interface BatchVerifyResult {
  checked: number
  promoted: number
  failed: number
  skipped: number
  problemIds: string[]
}

/** Verify unverified bank problems (developer / maintenance pipeline). */
export async function batchVerifyProblemBank(
  state: MathPilotState,
  limit = 40,
): Promise<{ state: MathPilotState; result: BatchVerifyResult }> {
  const { validateProblemAnswer } = await import('./problemValidation')
  const candidates = activeProblems(state)
    .filter((p) => p.verificationStatus !== 'verified' && p.verificationStatus !== 'deprecated')
    .slice(0, limit)

  let next = state
  const result: BatchVerifyResult = {
    checked: 0,
    promoted: 0,
    failed: 0,
    skipped: 0,
    problemIds: [],
  }

  for (const problem of candidates) {
    if (problem.answerType === 'choice') {
      result.skipped += 1
      continue
    }
    result.checked += 1
    result.problemIds.push(problem.id)
    try {
      const verification = await validateProblemAnswer(problem)
      if (verification.ok) {
        next = promoteProblemToVerified(next, problem.id)
        result.promoted += 1
      } else {
        next = markProblemUnverifiedUsed(next, problem.id)
        result.failed += 1
      }
    } catch {
      result.skipped += 1
    }
  }

  return {
    state: {
      ...next,
      changelog: [
        `${new Date().toISOString()}: Batch verify — ${result.promoted} promoted, ${result.failed} failed, ${result.skipped} skipped.`,
        ...next.changelog,
      ],
    },
    result,
  }
}
