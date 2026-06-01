import type { MathPilotState } from './types'

export interface MasteryTrendPoint {
  date: string
  avgMastery: number
  attempts: number
}

export interface SkillBar {
  skillId: string
  name: string
  score: number
}

export interface AnalyticsSnapshot {
  masteryTrend: MasteryTrendPoint[]
  weakestSkills: SkillBar[]
  strongestSkills: SkillBar[]
  reviewBacklog: number
  attemptAccuracy: number
  diagnosticCount: number
}

export function buildAnalyticsSnapshot(state: MathPilotState): AnalyticsSnapshot {
  const byDate = new Map<string, { sum: number; count: number; attempts: number }>()

  for (const attempt of [...state.attempts].reverse()) {
    const date = attempt.createdAt.slice(0, 10)
    const scores = attempt.skillIds.map((id) => state.mastery[id]?.masteryScore ?? 0)
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
    const row = byDate.get(date) ?? { sum: 0, count: 0, attempts: 0 }
    row.sum += avg
    row.count += 1
    row.attempts += 1
    byDate.set(date, row)
  }

  const masteryTrend = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, row]) => ({
      date,
      avgMastery: Math.round((row.sum / Math.max(row.count, 1)) * 100),
      attempts: row.attempts,
    }))

  const skillBars = Object.values(state.mastery)
    .filter((m) => state.skills[m.skillId])
    .map((m) => ({
      skillId: m.skillId,
      name: state.skills[m.skillId].name,
      score: Math.round(m.masteryScore * 100),
    }))
    .sort((a, b) => a.score - b.score)

  const correct = state.attempts.filter((a) => a.correct).length
  const attemptAccuracy = state.attempts.length ? Math.round((correct / state.attempts.length) * 100) : 0
  const today = new Date().toISOString().slice(0, 10)
  const reviewBacklog = state.reviewQueue.filter((r) => r.due <= today).length
  const diagnosticCount = state.attempts.filter((a) => a.mode === 'diagnostic').length

  return {
    masteryTrend,
    weakestSkills: skillBars.slice(0, 6),
    strongestSkills: [...skillBars].reverse().slice(0, 4),
    reviewBacklog,
    attemptAccuracy,
    diagnosticCount,
  }
}
