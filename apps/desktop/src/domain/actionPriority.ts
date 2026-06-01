import type { MathPilotState, MasteryRecord } from './types'
import { topMistakeSkillIds } from './curatorContext'

/** Higher = more urgent to practice or repair. */
export function masteryUrgencyScore(state: MathPilotState, record: MasteryRecord): number {
  let score = 1 - record.masteryScore
  score += record.recentFailures * 0.06
  if (record.masteryState === 'Decayed' || record.masteryState === 'Needs Review') score += 0.12
  if (topMistakeSkillIds(state, 5).includes(record.skillId)) score += 0.1
  return score
}

export function prioritizedWeakMastery(state: MathPilotState, limit = 8): MasteryRecord[] {
  return Object.values(state.mastery)
    .filter((m) => state.skills[m.skillId])
    .sort((a, b) => masteryUrgencyScore(state, b) - masteryUrgencyScore(state, a))
    .slice(0, limit)
}

export function topMistakeRepairSkill(state: MathPilotState): string | undefined {
  for (const skillId of topMistakeSkillIds(state, 3)) {
    const patternCount = Object.values(state.mistakePatterns)
      .filter((p) => p.skillIds.includes(skillId) && p.count >= 3)
      .reduce((max, p) => Math.max(max, p.count), 0)
    if (patternCount >= 3) return skillId
  }
  return undefined
}
