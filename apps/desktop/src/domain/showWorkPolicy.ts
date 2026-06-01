import type { MathPilotState, Problem } from './types'

export function requiresShowWork(state: MathPilotState, problem: Problem): boolean {
  if (problem.requiresShowWork) return true
  const skill = state.skills[problem.skillIds[0]]
  if (skill?.area.includes('Applications')) return true
  if (problem.mode === 'diagnostic' && problem.difficulty >= 0.5) return true
  const recentMisses = state.attempts
    .filter((a) => a.problemId === problem.id && !a.correct)
    .length
  if (recentMisses >= 1) return true
  const suspicious = state.attempts
    .slice(0, 3)
    .filter((a) => a.problemId === problem.id && a.correct && a.hintCount === 0)
  if (suspicious.length >= 2) return true
  return false
}
