import { enrichProblemWithLatex } from '../lib/problemLatex'
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
  const problem = enrichProblemWithLatex({
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
  })

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

  const symbolicProbe = await checkAnswerSymbolic(spec.expectedAnswer, spec.expectedAnswer, variables)
  let symbolic: 'passed' | 'failed' | 'skipped'
  let numeric: 'passed' | 'failed' | 'skipped'
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
  const problem = enrichProblemWithLatex({
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
  })

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

export interface CodexProblemPayload {
  title?: string
  prompt: string
  expectedAnswer: string
  answerType?: 'expression' | 'text'
  difficulty?: number
  hintSequence?: string[]
  variables?: string[]
}

export function parseCodexProblemPayload(stdout: string): CodexProblemPayload | null {
  const jsonMatch = stdout.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try {
    const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>
    const prompt = String(raw.prompt ?? raw.problem ?? '')
    const expectedAnswer = String(raw.expectedAnswer ?? raw.expected_answer ?? '')
    if (!prompt || !expectedAnswer) return null
    return {
      title: raw.title ? String(raw.title) : undefined,
      prompt,
      expectedAnswer,
      answerType: raw.answerType === 'text' || raw.answer_type === 'text' ? 'text' : 'expression',
      difficulty: typeof raw.difficulty === 'number' ? raw.difficulty : 0.5,
      hintSequence: Array.isArray(raw.hintSequence)
        ? raw.hintSequence.map(String)
        : Array.isArray(raw.hints)
          ? raw.hints.map(String)
          : ['Review the relevant skill.'],
      variables: Array.isArray(raw.variables) ? raw.variables.map(String) : ['x'],
    }
  } catch {
    return null
  }
}

/** Codex generation path (spec §9.2) — active when developer mode or Codex problem gen preference is on. */
export async function generateProblemViaCodexAsync(
  state: MathPilotState,
  skillId: string,
  seed = Date.now(),
): Promise<{ state: MathPilotState; record: GeneratedProblemRecord } | null> {
  const enableCodex = Boolean(
    (state.preferences as { enableCodexProblemGen?: boolean } | undefined)?.enableCodexProblemGen,
  )
  if (!state.developerModeEnabled && !enableCodex) return null

  const { invokeCodexForTask } = await import('./aiAdapter')
  const stubProblem: Problem = {
    id: `codex-stub-${skillId}`,
    title: `Generate for ${skillId}`,
    prompt: '',
    skillIds: [skillId],
    difficulty: 0.5,
    mode: 'guided_practice',
    answerType: 'expression',
    expectedAnswer: '',
    hintSequence: [],
    source: 'codex_generated',
  }

  const task = `generate_problem skill=${skillId} seed=${seed}`
  const { state: withCall, result } = await invokeCodexForTask(state, task, { problem: stubProblem })

  if (!result.ok) return null

  const payload = parseCodexProblemPayload(result.stdout)
  if (!payload) return null

  const spec: TemplateSpec = {
    skillId,
    title: payload.title ?? `Codex ${skillId}`,
    prompt: payload.prompt,
    expectedAnswer: payload.expectedAnswer,
    mode: 'guided_practice',
    difficulty: payload.difficulty ?? 0.5,
    answerType: payload.answerType ?? 'expression',
    hintSequence: payload.hintSequence ?? ['Review the relevant skill.'],
    variables: payload.variables,
    requiresShowWork: inferRequiresShowWork(payload.prompt, payload.answerType ?? 'expression'),
    ...inferCalculusVerify(payload.prompt),
  }

  const templateVerification = await verifyGeneratedProblemAsync(spec)
  const { validateProblemAnswer } = await import('./problemValidation')
  const independent = await validateProblemAnswer({
    id: `codex-pending-${skillId}`,
    title: spec.title,
    prompt: spec.prompt,
    skillIds: [skillId],
    difficulty: spec.difficulty,
    mode: spec.mode,
    answerType: spec.answerType,
    expectedAnswer: spec.expectedAnswer,
    hintSequence: spec.hintSequence,
  })
  const status =
    independent.ok || templateVerification.symbolic === 'passed' ? 'verified' : 'unverified_used'
  const id = `codex-${skillId}-${seed}`

  const problem = enrichProblemWithLatex({
    id,
    title: spec.title,
    prompt: spec.prompt,
    skillIds: [skillId],
    difficulty: spec.difficulty,
    mode: spec.mode,
    answerType: spec.answerType,
    expectedAnswer: spec.expectedAnswer,
    hintSequence: spec.hintSequence,
    verificationStatus: status,
    source: 'codex_generated',
    attemptCount: 0,
    requiresShowWork: spec.requiresShowWork,
  })

  const record: GeneratedProblemRecord = {
    problem,
    verification: templateVerification,
    codexMetadata: toCodexMetadata(problem, templateVerification),
  }

  return {
    state: {
      ...withCall,
      problems: { ...withCall.problems, [id]: problem },
      changelog: [
        `${new Date().toISOString()}: Codex generated ${id} (${status}, symbolic=${templateVerification.symbolic}, independent=${independent.ok}).`,
        ...withCall.changelog,
      ],
    },
    record,
  }
}
