import { generateProblemForSkill } from './problemGenerator'
import type { MathPilotState, Problem } from './types'

export const TEST_OUT_QUESTION_COUNT = 6

export interface TestOutSession {
  skillId: string
  queue: string[]
  currentIndex: number
  correctCount: number
  completed: boolean
}

export function startTestOut(state: MathPilotState, skillId: string): { state: MathPilotState; session: TestOutSession } {
  const queue: string[] = []
  let next = state
  for (let i = 0; i < TEST_OUT_QUESTION_COUNT; i += 1) {
    const generated = generateProblemForSkill(next, skillId, Date.now() + i * 997)
    if (!generated) break
    next = generated.state
    queue.push(generated.record.problem.id)
  }

  const session: TestOutSession = {
    skillId,
    queue,
    currentIndex: 0,
    correctCount: 0,
    completed: queue.length === 0,
  }
  return { state: { ...next, testOut: session }, session }
}

export function currentTestOutProblem(state: MathPilotState): Problem | undefined {
  const session = state.testOut
  if (!session || session.completed) return undefined
  const id = session.queue[session.currentIndex]
  return id ? state.problems[id] : undefined
}

export function submitTestOutAnswer(state: MathPilotState, correct: boolean): MathPilotState {
  const session = state.testOut
  if (!session || session.completed) return state

  const correctCount = session.correctCount + (correct ? 1 : 0)
  const currentIndex = session.currentIndex + 1
  const completed = currentIndex >= session.queue.length
  const passed = completed && correctCount >= Math.ceil(session.queue.length * 0.67)

  return {
    ...state,
    testOut: {
      ...session,
      currentIndex,
      correctCount,
      completed,
    },
    testOutResult: completed ? (passed ? 'passed' : 'failed') : undefined,
  }
}

export function clearTestOut(state: MathPilotState): MathPilotState {
  const next = { ...state }
  delete next.testOut
  delete next.testOutResult
  return next
}
