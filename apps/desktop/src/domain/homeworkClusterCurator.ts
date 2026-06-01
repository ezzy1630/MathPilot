import { ensureMemoryLoaded, invokeCodexForTask } from './aiAdapter'
import { parseHomeworkClusterResponse } from './codexParser'
import { chooseRepairRecommendation } from './homeworkLearningBridge'
import { loadSkillsForPrompt } from './skillLoader'
import type { MathPilotState } from './types'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const COOLDOWN_MS = 10 * 60 * 1000

export function shouldRunHomeworkClusterCurator(state: MathPilotState): boolean {
  if (state.homeworkAnalyses.length < 2) return false

  const latest = state.homeworkAnalyses[0]
  if (!latest) return false

  const age = Date.now() - new Date(latest.createdAt).getTime()
  if (age > SEVEN_DAYS_MS) return false

  if (state.homeworkClusterLastRun) {
    const since = Date.now() - new Date(state.homeworkClusterLastRun).getTime()
    if (since < COOLDOWN_MS) return false
  }

  return true
}

export async function runHomeworkClusterCurator(state: MathPilotState): Promise<MathPilotState> {
  if (!shouldRunHomeworkClusterCurator(state)) return state

  const recent = state.homeworkAnalyses
    .filter((a) => Date.now() - new Date(a.createdAt).getTime() <= SEVEN_DAYS_MS)
    .slice(0, 8)

  const memory = await ensureMemoryLoaded()
  const skillIds = [...new Set(recent.flatMap((a) => a.skillsAffected))].slice(0, 12)
  const skills = await loadSkillsForPrompt('homework_cluster_curator', skillIds)
  const summaries = recent.map((a) => ({
    id: a.id,
    topic: a.detectedTopic,
    correctness: a.correctness,
    tags: a.mistakeTags,
    skills: a.skillsAffected,
  }))

  const task = [
    'homework_cluster_curator',
    'Cluster recurring mistake patterns across recent homework analyses.',
    `Analyses: ${JSON.stringify(summaries)}`,
    'Return JSON only with keys: clustered_patterns ({tag, skill_ids, note, count}[]), repair_recommendations ({analysis_id, skill_id, reason}[]).',
  ].join(' ')

  const { state: logged, result } = await invokeCodexForTask(state, task, {
    memoryLines: memory,
    skillBodies: skills,
    forceNewSession: true,
  })

  const now = new Date().toISOString()
  let next: MathPilotState = {
    ...logged,
    homeworkClusterLastRun: now,
  }

  if (!result.ok || result.mode !== 'codex_cli') {
    return {
      ...next,
      changelog: [
        `${now}: Homework cluster curator skipped (Codex unavailable).`,
        ...next.changelog,
      ],
    }
  }

  const payload = parseHomeworkClusterResponse(result.stdout)
  if (!payload) {
    return {
      ...next,
      changelog: [`${now}: Homework cluster curator returned no parseable JSON.`, ...next.changelog],
    }
  }

  const mistakePatterns = { ...next.mistakePatterns }
  for (const pattern of payload.clustered_patterns ?? []) {
    const tag = pattern.tag.trim()
    if (!tag) continue
    const existing = mistakePatterns[tag]
    const skillIds = pattern.skill_ids?.filter((id) => next.skills[id]) ?? existing?.skillIds ?? []
    mistakePatterns[tag] = {
      tag,
      skillIds: skillIds.length ? skillIds : existing?.skillIds ?? [],
      count: Math.max(existing?.count ?? 0, pattern.count ?? recent.length),
      lastSeen: now,
      note: pattern.note?.trim() || existing?.note || `Homework cluster: ${tag}`,
    }
  }

  let homeworkAnalyses = [...next.homeworkAnalyses]
  for (const rec of payload.repair_recommendations ?? []) {
    const skillId = rec.skill_id.trim()
    if (!skillId || !next.skills[skillId]) continue
    const idx = rec.analysis_id
      ? homeworkAnalyses.findIndex((a) => a.id === rec.analysis_id)
      : 0
    if (idx < 0) continue
    const entry = homeworkAnalyses[idx]
    homeworkAnalyses[idx] = {
      ...entry,
      repairRecommendation: { skillId, reason: rec.reason.trim() },
    }
  }

  const latest = homeworkAnalyses[0]
  if (latest && !latest.repairRecommendation && latest.correctness !== 'correct') {
    const repair = chooseRepairRecommendation(next, latest.skillsAffected, latest.mistakeTags)
    if (repair) {
      homeworkAnalyses[0] = { ...latest, repairRecommendation: repair }
    }
  }

  return {
    ...next,
    mistakePatterns,
    homeworkAnalyses,
    changelog: [
      `${now}: Homework cluster curator updated patterns and repair hints.`,
      ...next.changelog,
    ],
  }
}
