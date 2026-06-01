import type { MathPilotState } from './types'

export interface SearchHit {
  id: string
  kind: 'skill' | 'problem' | 'attempt' | 'resource'
  title: string
  subtitle: string
  skillId?: string
}

export async function searchViaFts(query: string, limit = 12): Promise<Array<{ entityType: string; entityId: string; body: string }>> {
  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) return []
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke('search_index_query', { query, limit })
  } catch {
    return []
  }
}

export function mergeSearchHits(
  state: MathPilotState,
  query: string,
  ftsRows: Array<{ entityType: string; entityId: string; body: string }>,
  limit = 10,
): SearchHit[] {
  const inMemory = searchAppState(state, query, limit)
  const seen = new Set(inMemory.map((h) => h.id))
  const extra: SearchHit[] = []

  for (const row of ftsRows) {
    const id = `${row.entityType}-${row.entityId}`
    if (seen.has(id)) continue
    if (row.entityType === 'skill' && state.skills[row.entityId]) {
      const skill = state.skills[row.entityId]
      extra.push({
        id: `skill-${row.entityId}`,
        kind: 'skill',
        title: skill.name,
        subtitle: skill.area,
        skillId: row.entityId,
      })
    } else if (row.entityType === 'problem' && state.problems[row.entityId]) {
      const problem = state.problems[row.entityId]
      extra.push({
        id: `problem-${row.entityId}`,
        kind: 'problem',
        title: problem.title,
        subtitle: problem.prompt.slice(0, 80),
        skillId: problem.skillIds[0],
      })
    } else if (row.entityType === 'resource' && state.resources[row.entityId]) {
      const resource = state.resources[row.entityId]
      extra.push({
        id: `resource-${row.entityId}`,
        kind: 'resource',
        title: resource.title,
        subtitle: resource.source,
        skillId: resource.skillIds[0],
      })
    }
    if (inMemory.length + extra.length >= limit) break
  }

  return [...inMemory, ...extra].slice(0, limit)
}

export function searchAppState(state: MathPilotState, query: string, limit = 10): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []

  const hits: SearchHit[] = []

  for (const skill of Object.values(state.skills)) {
    if (skill.name.toLowerCase().includes(q) || skill.id.includes(q) || skill.area.toLowerCase().includes(q)) {
      const mastery = state.mastery[skill.id]
      hits.push({
        id: `skill-${skill.id}`,
        kind: 'skill',
        title: skill.name,
        subtitle: `${skill.area} · ${Math.round((mastery?.masteryScore ?? 0) * 100)}% mastery`,
        skillId: skill.id,
      })
    }
  }

  for (const problem of Object.values(state.problems)) {
    if (problem.deprecated) continue
    const text = `${problem.title} ${problem.prompt} ${problem.skillIds.join(' ')}`.toLowerCase()
    if (text.includes(q)) {
      hits.push({
        id: `problem-${problem.id}`,
        kind: 'problem',
        title: problem.title,
        subtitle: problem.prompt.slice(0, 80),
        skillId: problem.skillIds[0],
      })
    }
  }

  for (const attempt of state.attempts.slice(0, 40)) {
    const problem = state.problems[attempt.problemId]
    if (!problem) continue
    const text = `${problem.title} ${attempt.answer}`.toLowerCase()
    if (text.includes(q)) {
      hits.push({
        id: `attempt-${attempt.id}`,
        kind: 'attempt',
        title: problem.title,
        subtitle: `${attempt.correct ? 'Correct' : 'Miss'} · ${attempt.answer.slice(0, 40)}`,
        skillId: attempt.skillIds[0],
      })
    }
  }

  for (const resource of Object.values(state.resources)) {
    if (`${resource.title} ${resource.source}`.toLowerCase().includes(q)) {
      hits.push({
        id: `resource-${resource.id}`,
        kind: 'resource',
        title: resource.title,
        subtitle: resource.source,
        skillId: resource.skillIds[0],
      })
    }
  }

  return hits.slice(0, limit)
}
