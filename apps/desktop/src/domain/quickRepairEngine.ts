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
      targetProblems: 4,
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
  const targeted = pool.filter((p) => p.mode === 'quick_repair' || p.mode === 'guided_practice')
  if (targeted.length) return targeted[session.problemsAnswered % targeted.length]
  return pool[session.problemsAnswered % pool.length]
}

export function advanceQuickRepair(state: MathPilotState, correct: boolean): MathPilotState {
  const session = state.quickRepair
  if (!session) return state

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

  const answered = session.problemsAnswered + (correct ? 1 : 0)

  if (session.phase === 'practice') {
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
