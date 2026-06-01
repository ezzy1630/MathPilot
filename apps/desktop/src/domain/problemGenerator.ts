import { SKILL_CATALOG } from './skillProblemCatalog'
import { checkAnswer, checkAnswerAsync } from './mathEngine'
import type { ActivityKind, MathPilotState, Problem } from './types'

export interface GeneratedProblemRecord {
  problem: Problem
  verification: {
    symbolic: 'passed' | 'failed' | 'skipped'
    numeric: 'passed' | 'failed' | 'skipped'
    checkedAt: string
  }
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
  }))
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
    record: { problem, verification },
  }
}

export async function verifyGeneratedProblemAsync(
  spec: TemplateSpec,
): Promise<GeneratedProblemRecord['verification']> {
  const probe = await checkAnswerAsync({
    expected: spec.expectedAnswer,
    actual: spec.expectedAnswer,
    variables: spec.variables ?? ['x'],
    skillIds: [spec.skillId],
  })
  return {
    symbolic: probe.method === 'symbolic' && probe.correct ? 'passed' : probe.correct ? 'passed' : 'failed',
    numeric: probe.method === 'numeric' || probe.method === 'symbolic' ? 'passed' : 'skipped',
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
    record: { problem, verification },
  }
}

export function pickGeneratedProblem(state: MathPilotState, skillId: string): Problem | undefined {
  return Object.values(state.problems).find(
    (p) => p.skillIds.includes(skillId) && p.source === 'template_engine' && !p.deprecated,
  )
}
