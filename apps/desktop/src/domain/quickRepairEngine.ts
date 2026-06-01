import type { MathPilotState, Problem, Skill } from './types'

export type QuickRepairPhase =
  | 'explain'
  | 'example_1'
  | 'example_2'
  | 'practice'
  | 'mixed_check'
  | 'complete'

export interface QuickRepairSession {
  skillId: string
  phase: QuickRepairPhase
  phaseIndex: number
  problemsAnswered: number
  targetProblems: number
}

const PHASE_ORDER: QuickRepairPhase[] = [
  'explain',
  'example_1',
  'example_2',
  'practice',
  'mixed_check',
  'complete',
]

const TARGET_PRACTICE_COUNT = 4

function repairPriority(problem: Problem): number {
  if (problem.mode === 'quick_repair') return 0
  if (problem.id.startsWith('repair-')) return 1
  if (problem.source === 'curated_json') return 2
  return 3
}

function targetedPracticePool(state: MathPilotState, skillId: string): Problem[] {
  return Object.values(state.problems)
    .filter(
      (p) =>
        p.skillIds.includes(skillId) &&
        !p.deprecated &&
        (p.mode === 'quick_repair' || p.mode === 'guided_practice' || p.mode === 'independent_practice'),
    )
    .sort((a, b) => repairPriority(a) - repairPriority(b) || a.id.localeCompare(b.id))
}

export function buildQuickRepairPracticeQueue(state: MathPilotState, skillId: string): string[] {
  const pool = targetedPracticePool(state, skillId)
  const unique: string[] = []
  const seenPrompts = new Set<string>()

  for (const problem of pool) {
    if (unique.length >= TARGET_PRACTICE_COUNT) break
    const key = problem.prompt.trim().toLowerCase()
    if (seenPrompts.has(key)) continue
    seenPrompts.add(key)
    unique.push(problem.id)
  }

  if (unique.length < TARGET_PRACTICE_COUNT) {
    for (const problem of pool) {
      if (unique.length >= TARGET_PRACTICE_COUNT) break
      if (unique.includes(problem.id)) continue
      unique.push(problem.id)
    }
  }

  return unique.slice(0, TARGET_PRACTICE_COUNT)
}

export function startQuickRepair(state: MathPilotState, skillId: string): MathPilotState {
  const skill = state.skills[skillId]
  if (!skill) return state
  return {
    ...state,
    quickRepair: {
      skillId,
      phase: 'explain',
      phaseIndex: 0,
      problemsAnswered: 0,
      targetProblems: TARGET_PRACTICE_COUNT,
    },
    changelog: [
      `${new Date().toISOString()}: Quick repair started for ${skill.name}.`,
      ...state.changelog,
    ],
  }
}

export function quickRepairExplanation(skill: Skill): { summary: string; steps: string[] } {
  return {
    summary: `Stabilize ${skill.name} before moving on.`,
    steps: [
      `Core idea: ${skill.name} — ${skill.type === 'conceptual' ? 'focus on definitions and conditions' : 'focus on setup before algebra'}`,
      `Watch for: ${skill.commonMistakes.slice(0, 2).join(' · ') || 'sign and setup errors'}`,
      'Read the worked example, then solve a parallel problem without hints.',
    ],
  }
}

export function currentQuickRepairProblem(state: MathPilotState): Problem | undefined {
  const session = state.quickRepair
  if (!session || session.phase === 'explain' || session.phase === 'complete') return undefined

  const pool = Object.values(state.problems).filter(
    (p) => p.skillIds.includes(session.skillId) && !p.deprecated,
  )

  if (session.phase === 'mixed_check') {
    return pool.find((p) => p.mode === 'mixed_review') ?? pool[0]
  }

  if (session.phase === 'example_1' || session.phase === 'example_2') {
    const examples = pool.filter((p) => Boolean(p.workedExample?.length))
    const index = session.phase === 'example_1' ? 0 : 1
    return examples[index] ?? pool[index]
  }

  if (session.phase === 'practice') {
    const queue = buildQuickRepairPracticeQueue(state, session.skillId)
    const queueId = queue[session.problemsAnswered]
    if (queueId && state.problems[queueId]) return state.problems[queueId]
    return targetedPracticePool(state, session.skillId)[session.problemsAnswered]
  }

  return undefined
}

export function advanceQuickRepair(state: MathPilotState, correct: boolean): MathPilotState {
  const session = state.quickRepair
  if (!session) return state
  void correct

  if (session.phase === 'explain') {
    return {
      ...state,
      quickRepair: { ...session, phase: 'example_1', phaseIndex: 1 },
    }
  }

  if (session.phase === 'example_1') {
    return {
      ...state,
      quickRepair: { ...session, phase: 'example_2', phaseIndex: 2 },
    }
  }

  if (session.phase === 'example_2') {
    return {
      ...state,
      quickRepair: { ...session, phase: 'practice', phaseIndex: 3, problemsAnswered: 0 },
    }
  }

  if (session.phase === 'practice') {
    const answered = session.problemsAnswered + 1
    if (answered < session.targetProblems) {
      return {
        ...state,
        quickRepair: { ...session, problemsAnswered: answered },
      }
    }
    return {
      ...state,
      quickRepair: { ...session, phase: 'mixed_check', phaseIndex: 4, problemsAnswered: 0 },
    }
  }

  if (session.phase === 'mixed_check') {
    const skill = state.skills[session.skillId]
    return {
      ...state,
      quickRepair: { ...session, phase: 'complete', phaseIndex: 5 },
      changelog: [
        `${new Date().toISOString()}: Quick repair completed for ${skill?.name ?? session.skillId}.`,
        ...state.changelog,
      ],
    }
  }

  return state
}

export function clearQuickRepair(state: MathPilotState): MathPilotState {
  const rest = { ...state }
  delete rest.quickRepair
  return rest
}

export function phaseLabel(phase: QuickRepairPhase): string {
  const labels: Record<QuickRepairPhase, string> = {
    explain: 'Short explanation',
    example_1: 'Worked example 1',
    example_2: 'Worked example 2',
    practice: 'Targeted practice',
    mixed_check: 'Mixed check',
    complete: 'Complete',
  }
  return labels[phase]
}

export function repairProgress(session: QuickRepairSession): string {
  const step = PHASE_ORDER.indexOf(session.phase) + 1
  return `Step ${step}/${PHASE_ORDER.length - 1}: ${phaseLabel(session.phase)}`
}
