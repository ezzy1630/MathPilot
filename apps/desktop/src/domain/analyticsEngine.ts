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

export interface ResourceEffectivenessEntry {
  id: string
  title: string
  source: string
  score: number
}

export interface MistakePatternEntry {
  tag: string
  count: number
  note: string
}

export interface MasteryImprovementTrend {
  recent7dAvg: number
  prior7dAvg: number
  deltaPct: number
  direction: 'up' | 'down' | 'flat'
}

export interface AnalyticsSnapshot {
  masteryTrend: MasteryTrendPoint[]
  weakestSkills: SkillBar[]
  strongestSkills: SkillBar[]
  reviewBacklog: number
  attemptAccuracy: number
  diagnosticCount: number
  resourceEffectivenessTop: ResourceEffectivenessEntry[]
  mistakePatternTop: MistakePatternEntry[]
  masteryImprovementTrend: MasteryImprovementTrend
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

  const resourceEffectivenessTop = Object.values(state.resources)
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      title: r.title,
      source: r.source,
      score: Math.round(r.effectivenessScore * 100),
    }))

  const mistakePatternTop = Object.values(state.mistakePatterns)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((p) => ({
      tag: p.tag,
      count: p.count,
      note: p.note,
    }))

  const masteryImprovementTrend = computeMasteryImprovementTrend(state)

  return {
    masteryTrend,
    weakestSkills: skillBars.slice(0, 6),
    strongestSkills: [...skillBars].reverse().slice(0, 4),
    reviewBacklog,
    attemptAccuracy,
    diagnosticCount,
    resourceEffectivenessTop,
    mistakePatternTop,
    masteryImprovementTrend,
  }
}

function attemptAvgMastery(state: MathPilotState, attempt: (typeof state.attempts)[number]): number {
  const scores = attempt.skillIds.map((id) => state.mastery[id]?.masteryScore ?? 0)
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
}

function computeMasteryImprovementTrend(state: MathPilotState): MasteryImprovementTrend {
  const now = new Date()
  const dayMs = 86_400_000
  const recentStart = new Date(now.getTime() - 7 * dayMs)
  const priorStart = new Date(now.getTime() - 14 * dayMs)

  const recent: number[] = []
  const prior: number[] = []

  for (const attempt of state.attempts) {
    const at = new Date(attempt.createdAt)
    if (Number.isNaN(at.getTime())) continue
    const avg = attemptAvgMastery(state, attempt)
    if (at >= recentStart) recent.push(avg)
    else if (at >= priorStart && at < recentStart) prior.push(avg)
  }

  const recent7dAvg = recent.length ? Math.round((recent.reduce((a, b) => a + b, 0) / recent.length) * 100) : 0
  const prior7dAvg = prior.length ? Math.round((prior.reduce((a, b) => a + b, 0) / prior.length) * 100) : 0
  const deltaPct = recent7dAvg - prior7dAvg
  const direction: MasteryImprovementTrend['direction'] =
    Math.abs(deltaPct) < 2 ? 'flat' : deltaPct > 0 ? 'up' : 'down'

  return { recent7dAvg, prior7dAvg, deltaPct, direction }
}
