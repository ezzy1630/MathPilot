import { chooseRepairRecommendation } from './homeworkLearningBridge'
import type { HomeworkAnalysis, MathPilotState, MistakePattern } from './types'

export interface DeterministicHomeworkClusterResult {
  mistakePatterns: Record<string, MistakePattern>
  homeworkAnalyses: HomeworkAnalysis[]
  summaryBullets: string[]
}

/** Cluster recurring homework mistake tags without Codex. */
export function clusterHomeworkDeterministic(state: MathPilotState): DeterministicHomeworkClusterResult {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent = state.homeworkAnalyses.filter((a) => new Date(a.createdAt).getTime() >= sevenDaysAgo)
  const tagCounts = new Map<string, { count: number; skillIds: Set<string>; analyses: string[] }>()

  for (const analysis of recent) {
    for (const tag of analysis.mistakeTags) {
      const row = tagCounts.get(tag) ?? { count: 0, skillIds: new Set<string>(), analyses: [] }
      row.count += 1
      analysis.skillsAffected.forEach((id) => row.skillIds.add(id))
      if (!row.analyses.includes(analysis.id)) row.analyses.push(analysis.id)
      tagCounts.set(tag, row)
    }
  }

  const mistakePatterns = { ...state.mistakePatterns }
  const summaryBullets: string[] = []
  const now = new Date().toISOString()

  for (const [tag, row] of tagCounts) {
    if (row.count < 2) continue
    const skillIds = [...row.skillIds].filter((id) => state.skills[id])
    const existing = mistakePatterns[tag]
    mistakePatterns[tag] = {
      tag,
      skillIds: skillIds.length ? skillIds : (existing?.skillIds ?? []),
      count: Math.max(existing?.count ?? 0, row.count),
      lastSeen: now,
      note: `Homework cluster (${row.count} uploads): ${tag.replace(/_/g, ' ')}`,
    }
    const skillName = skillIds[0] ? state.skills[skillIds[0]]?.name : 'mixed skills'
    summaryBullets.push(`${skillName} — ${tag} (${row.count}× in recent homework)`)
  }

  const homeworkAnalyses = [...state.homeworkAnalyses]
  const latest = homeworkAnalyses[0]
  if (latest && latest.correctness !== 'correct' && !latest.repairRecommendation) {
    const repair = chooseRepairRecommendation(state, latest.skillsAffected, latest.mistakeTags)
    if (repair) {
      homeworkAnalyses[0] = { ...latest, repairRecommendation: repair }
    }
  }

  for (const [tag, row] of tagCounts) {
    if (row.count < 2 || !row.analyses[0]) continue
    const idx = homeworkAnalyses.findIndex((a) => a.id === row.analyses[0])
    if (idx < 0) continue
    const entry = homeworkAnalyses[idx]
    if (entry.repairRecommendation) continue
    const skillId = [...row.skillIds].find((id) => state.skills[id])
    if (!skillId) continue
    homeworkAnalyses[idx] = {
      ...entry,
      repairRecommendation: {
        skillId,
        reason: `Recurring homework pattern: ${tag.replace(/_/g, ' ')} (${row.count} similar uploads).`,
      },
    }
  }

  return { mistakePatterns, homeworkAnalyses, summaryBullets }
}
