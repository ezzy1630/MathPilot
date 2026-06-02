import { checkAnswerAsync } from './mathEngine'
import { checkAnswerSymbolic, verifyCalculusSymbolic } from './symbolicCheck'
import type { DiagnosticProbeIntent } from './diagnosticBatchPlan'
import type { Problem } from './types'

export interface ValidateProblemResult {
  ok: boolean
  symbolic: 'passed' | 'failed' | 'skipped'
  calculus: 'passed' | 'failed' | 'skipped'
  reason?: string
}

const DERIVATIVE_PATTERNS = [
  /Differentiate f\(x\) = (.+?)\./i,
  /Differentiate y = (.+?)\./i,
  /Find the derivative of f\(x\) = (.+?)\./i,
  /Using the limit definition, find f\\?'?\(x\) for f\(x\) = (.+?)\./i,
  /d\/dx\s+(.+?)(?:\s*=|\?|$)/i,
]

const INTEGRAL_PATTERNS = [
  /Integrate (.+?) with respect to/i,
  /Find the antiderivative of (.+?)\./i,
  /Evaluate ∫\s*(.+?)\s*dx/i,
  /∫\s*(.+?)\s*dx/i,
]

function inferCalculusVerify(prompt: string): {
  verifyExpression?: string
  verifyMode?: 'derivative' | 'integral'
} {
  for (const pattern of DERIVATIVE_PATTERNS) {
    const match = prompt.match(pattern)
    if (match?.[1]) return { verifyExpression: match[1].trim(), verifyMode: 'derivative' }
  }
  for (const pattern of INTEGRAL_PATTERNS) {
    const match = prompt.match(pattern)
    if (match?.[1]) return { verifyExpression: match[1].trim(), verifyMode: 'integral' }
  }
  return {}
}

/**
 * Independent SymPy-backed check for procedural problems (batch verify, codex save).
 * Uses Tauri invoke when available; falls back to local math engine.
 */
export async function validateProblemAnswer(problem: Problem): Promise<ValidateProblemResult> {
  if (problem.answerType === 'choice') {
    return { ok: true, symbolic: 'skipped', calculus: 'skipped', reason: 'choice_problem' }
  }

  if (problem.answerType === 'text') {
    return { ok: true, symbolic: 'skipped', calculus: 'skipped', reason: 'text_answer' }
  }

  const variables = ['x']
  const expected = problem.expectedAnswer

  const symbolicProbe = await checkAnswerSymbolic(expected, expected, variables)
  let symbolic: ValidateProblemResult['symbolic']
  if (symbolicProbe?.correct) {
    symbolic = 'passed'
  } else {
    const probe = await checkAnswerAsync({
      expected,
      actual: expected,
      variables,
      skillIds: problem.skillIds,
    })
    symbolic = probe.correct ? 'passed' : 'failed'
  }

  let calculus: ValidateProblemResult['calculus'] = 'skipped'
  const { verifyExpression, verifyMode } = inferCalculusVerify(problem.prompt)
  if (verifyExpression && verifyMode) {
    const calculusResult = await verifyCalculusSymbolic({
      expression: verifyExpression,
      expected,
      mode: verifyMode,
      variables,
    })
    if (calculusResult === 'passed') calculus = 'passed'
    else if (calculusResult === 'failed') calculus = 'failed'
  }

  const ok =
    symbolic === 'passed' &&
    (calculus === 'passed' || calculus === 'skipped')

  if (calculus === 'failed') {
    return { ok: false, symbolic, calculus, reason: 'calculus_mismatch' }
  }
  if (symbolic === 'failed') {
    return { ok: false, symbolic, calculus, reason: 'symbolic_mismatch' }
  }

  return { ok, symbolic, calculus }
}

/** Gate diagnostic candidates before they enter the live queue. */
export async function validateDiagnosticCandidate(
  problem: Problem,
  probe?: DiagnosticProbeIntent,
): Promise<ValidateProblemResult> {
  if (!problem.prompt.trim()) {
    return { ok: false, symbolic: 'skipped', calculus: 'skipped', reason: 'empty_prompt' }
  }
  if (!problem.expectedAnswer.trim()) {
    return { ok: false, symbolic: 'skipped', calculus: 'skipped', reason: 'empty_answer' }
  }
  if (probe && !problem.skillIds.includes(probe.skillId)) {
    return { ok: false, symbolic: 'skipped', calculus: 'skipped', reason: 'skill_mismatch' }
  }
  if (problem.answerType === 'choice') {
    const choices = problem.choices ?? []
    if (choices.length < 2) {
      return { ok: false, symbolic: 'skipped', calculus: 'skipped', reason: 'choice_too_few' }
    }
    return { ok: true, symbolic: 'skipped', calculus: 'skipped', reason: 'choice_problem' }
  }
  if (problem.answerType === 'text') {
    return { ok: true, symbolic: 'skipped', calculus: 'skipped', reason: 'text_answer' }
  }
  return validateProblemAnswer(problem)
}
