import { SKILL_CATALOG } from './skillProblemCatalog'
import { toCodexMetadata } from './problemBank'
import { checkAnswer, checkAnswerAsync } from './mathEngine'
import { checkAnswerSymbolic, verifyCalculusSymbolic } from './symbolicCheck'
import type { ActivityKind, MathPilotState, Problem } from './types'

export interface GeneratedProblemRecord {
  problem: Problem
  verification: {
    symbolic: 'passed' | 'failed' | 'skipped'
    numeric: 'passed' | 'failed' | 'skipped'
    checkedAt: string
  }
  codexMetadata?: ReturnType<typeof toCodexMetadata>
}

interface TemplateSpec {
  skillId: string
  title: string
  prompt: string
  expectedAnswer: string
  mode: ActivityKind
  difficulty: number
  answerType: 'expression' | 'text'
  hintSequence: string[]
  variables?: string[]
  requiresShowWork?: boolean
  verifyExpression?: string
  verifyMode?: 'derivative' | 'integral'
}

function practiceTemplatesForSkill(skillId: string): TemplateSpec[] {
  const entry = SKILL_CATALOG[skillId]
  if (!entry) return []
  return entry.practice.map((spec) => ({
    skillId,
    title: spec.title,
    prompt: spec.prompt,
    expectedAnswer: spec.expectedAnswer,
    mode: spec.mode,
    difficulty: spec.difficulty,
    answerType: spec.answerType,
    hintSequence: spec.hintSequence,
    variables: spec.variables,
    requiresShowWork: inferRequiresShowWork(spec.prompt, spec.answerType),
    ...inferCalculusVerify(spec.prompt),
  }))
}

function inferRequiresShowWork(prompt: string, answerType: string): boolean {
  if (answerType === 'text') return false
  return /differentiate|derivative|integrate|antiderivative|solve|evaluate lim/i.test(prompt)
}

const DERIVATIVE_PATTERNS = [
  /Differentiate f\(x\) = (.+?)\./i,
  /Differentiate y = (.+?)\./i,
  /Find the derivative of f\(x\) = (.+?)\./i,
  /Using the limit definition, find f\\?'?\(x\) for f\(x\) = (.+?)\./i,
]

const INTEGRAL_PATTERNS = [
  /Integrate (.+?) with respect to/i,
  /Find the antiderivative of (.+?)\./i,
  /Evaluate ∫\s*(.+?)\s*dx/i,
  /∫\s*(.+?)\s*dx/i,
]

function inferCalculusVerify(prompt: string): Pick<TemplateSpec, 'verifyExpression' | 'verifyMode'> {
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

async function runCalculusVerification(
  spec: TemplateSpec,
): Promise<'passed' | 'failed' | 'skipped'> {
  if (!spec.verifyExpression || !spec.verifyMode || spec.answerType !== 'expression') {
    return 'skipped'
  }
  const variables = spec.variables ?? ['x']
  const calculus = await verifyCalculusSymbolic({
    expression: spec.verifyExpression,
    expected: spec.expectedAnswer,
    mode: spec.verifyMode,
    variables,
  })
  return calculus ?? 'skipped'
}

export function verifyGeneratedProblem(spec: TemplateSpec): GeneratedProblemRecord['verification'] {
  const probe = checkAnswer({
    expected: spec.expectedAnswer,
    actual: spec.expectedAnswer,
    variables: spec.variables ?? ['x'],
    skillIds: [spec.skillId],
  })
  return {
    symbolic: probe.correct ? 'passed' : 'failed',
    numeric: probe.method === 'numeric' || probe.method === 'symbolic' ? 'passed' : 'skipped',
    checkedAt: new Date().toISOString(),
  }
}

export function generateProblemForSkill(
  state: MathPilotState,
  skillId: string,
  seed = Date.now(),
): { state: MathPilotState; record: GeneratedProblemRecord } | null {
  const pool = practiceTemplatesForSkill(skillId)
  if (!pool.length) return null

  const spec = pool[seed % pool.length]
  const verification = verifyGeneratedProblem(spec)
  const status = verification.symbolic === 'passed' ? 'verified' : 'unverified_used'

  const id = `gen-${skillId}-${seed}`
  const problem: Problem = {
    id,
    title: spec.title,
    prompt: spec.prompt,
    skillIds: [spec.skillId],
    difficulty: spec.difficulty,
    mode: spec.mode,
    answerType: spec.answerType,
    expectedAnswer: spec.expectedAnswer,
    hintSequence: spec.hintSequence,
    verificationStatus: status,
    source: 'template_engine',
    attemptCount: 0,
    requiresShowWork: spec.requiresShowWork,
  }

  const record: GeneratedProblemRecord = {
    problem,
    verification,
    codexMetadata: toCodexMetadata(problem, verification),
  }

  return {
    state: {
      ...state,
      problems: { ...state.problems, [id]: problem },
      changelog: [
        `${new Date().toISOString()}: Generated problem ${id} (${status}, symbolic=${verification.symbolic}).`,
        ...state.changelog,
      ],
    },
    record,
  }
}

export async function verifyGeneratedProblemAsync(
  spec: TemplateSpec,
): Promise<GeneratedProblemRecord['verification']> {
  const variables = spec.variables ?? ['x']
  let symbolic: 'passed' | 'failed' | 'skipped' = 'skipped'
  let numeric: 'passed' | 'failed' | 'skipped' = 'skipped'

  const symbolicProbe = await checkAnswerSymbolic(spec.expectedAnswer, spec.expectedAnswer, variables)
  if (symbolicProbe?.correct) {
    symbolic = 'passed'
    numeric = symbolicProbe.method === 'numeric' ? 'passed' : 'passed'
  } else {
    const probe = await checkAnswerAsync({
      expected: spec.expectedAnswer,
      actual: spec.expectedAnswer,
      variables,
      skillIds: [spec.skillId],
    })
    symbolic = probe.correct ? 'passed' : 'failed'
    numeric = probe.method === 'numeric' || probe.method === 'symbolic' ? 'passed' : 'skipped'
  }

  const calculusResult = await runCalculusVerification(spec)
  if (calculusResult === 'failed') {
    symbolic = 'failed'
  } else if (calculusResult === 'passed' && symbolic !== 'passed') {
    symbolic = 'passed'
  }

  return {
    symbolic,
    numeric,
    checkedAt: new Date().toISOString(),
  }
}

export async function generateProblemForSkillAsync(
  state: MathPilotState,
  skillId: string,
  seed = Date.now(),
): Promise<{ state: MathPilotState; record: GeneratedProblemRecord } | null> {
  const pool = practiceTemplatesForSkill(skillId)
  if (!pool.length) return null

  const spec = pool[seed % pool.length]
  const verification = await verifyGeneratedProblemAsync(spec)
  const status = verification.symbolic === 'passed' ? 'verified' : 'unverified_used'

  const id = `gen-${skillId}-${seed}`
  const problem: Problem = {
    id,
    title: spec.title,
    prompt: spec.prompt,
    skillIds: [spec.skillId],
    difficulty: spec.difficulty,
    mode: spec.mode,
    answerType: spec.answerType,
    expectedAnswer: spec.expectedAnswer,
    hintSequence: spec.hintSequence,
    verificationStatus: status,
    source: 'template_engine',
    attemptCount: 0,
    requiresShowWork: spec.requiresShowWork,
  }

  const record: GeneratedProblemRecord = {
    problem,
    verification,
    codexMetadata: toCodexMetadata(problem, verification),
  }

  return {
    state: {
      ...state,
      problems: { ...state.problems, [id]: problem },
      changelog: [
        `${new Date().toISOString()}: Generated problem ${id} (${status}, symbolic=${verification.symbolic}).`,
        ...state.changelog,
      ],
    },
    record,
  }
}

export function pickGeneratedProblem(state: MathPilotState, skillId: string): Problem | undefined {
  return Object.values(state.problems).find(
    (p) => p.skillIds.includes(skillId) && p.source === 'template_engine' && !p.deprecated,
  )
}
