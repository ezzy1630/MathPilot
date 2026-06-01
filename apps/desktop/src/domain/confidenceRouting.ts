import type { MathPilotState } from './types'

/** Surface skills where recent confidence was miscalibrated. */
export function confidenceCalibrationHint(state: MathPilotState): string | undefined {
  const recent = state.attempts.slice(0, 12).filter((a) => a.confidence !== undefined)
  const over = recent.filter((a) => (a.confidence ?? 0) >= 4 && !a.correct)
  if (over.length >= 2) {
    const skill = state.skills[over[0].skillIds[0]]
    return skill
      ? `You felt confident on ${skill.name} but missed twice — a short repair will recalibrate.`
      : 'Recent answers were overconfident — slow down and check setup first.'
  }
  const under = recent.filter((a) => (a.confidence ?? 0) <= 2 && a.correct)
  if (under.length >= 3) {
    return 'You know more than you think — try the next problem without hints.'
  }
  return undefined
}

export function confidenceReviewBoost(state: MathPilotState, skillId: string): number {
  const recent = state.attempts
    .filter((a) => a.skillIds.includes(skillId) && a.confidence !== undefined)
    .slice(0, 5)
  const overMiss = recent.filter((a) => (a.confidence ?? 0) >= 4 && !a.correct).length
  return overMiss >= 1 ? 15 : 0
}
