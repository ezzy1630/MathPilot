import type { MathPilotState } from './types'

/** Compact learner snapshot for Codex curator prompts (no full attempt dump). */
export function buildLearnerSnapshot(state: MathPilotState): string {
  const today = new Date().toISOString().slice(0, 10)
  const weak = Object.values(state.mastery)
    .filter((m) => state.skills[m.skillId])
    .sort((a, b) => a.masteryScore - b.masteryScore)
    .slice(0, 6)
    .map((m) => `${state.skills[m.skillId].name} (${Math.round(m.masteryScore * 100)}%, ${m.masteryState})`)

  const strong = Object.values(state.mastery)
    .filter((m) => state.skills[m.skillId] && m.masteryScore >= 0.72)
    .sort((a, b) => b.masteryScore - a.masteryScore)
    .slice(0, 4)
    .map((m) => state.skills[m.skillId].name)

  const patterns = Object.values(state.mistakePatterns)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((p) => `${p.tag} (${p.count}×, skills: ${p.skillIds.map((id) => state.skills[id]?.name ?? id).join(', ') || '—'})`)

  const dueReview = state.reviewQueue.filter((r) => r.due <= today).length
  const recent = state.attempts.slice(0, 12)
  const accuracy =
    recent.length > 0
      ? Math.round((recent.filter((a) => a.correct).length / recent.length) * 100)
      : null

  const lines = [
    `Course focus: ${state.currentFocus}`,
    `Weak skills: ${weak.join('; ') || 'none yet'}`,
    `Strong skills: ${strong.join('; ') || 'none yet'}`,
    `Mistake patterns: ${patterns.join('; ') || 'none'}`,
    `Review due today: ${dueReview}`,
    accuracy !== null ? `Recent accuracy (last ${recent.length}): ${accuracy}%` : 'Recent accuracy: n/a',
  ]

  if (state.coachInsight?.narrative) {
    lines.push(`Current coach note: ${state.coachInsight.narrative.slice(0, 280)}`)
  }

  return lines.join('\n')
}

export function topMistakeSkillIds(state: MathPilotState, limit = 3): string[] {
  const scores = new Map<string, number>()
  for (const pattern of Object.values(state.mistakePatterns)) {
    for (const skillId of pattern.skillIds) {
      if (!state.skills[skillId]) continue
      scores.set(skillId, (scores.get(skillId) ?? 0) + pattern.count)
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
}
