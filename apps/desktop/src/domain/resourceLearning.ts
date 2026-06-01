import type { AttemptInput, MathPilotState, ResourceEvent } from './types'

function appendResourceEvent(
  state: MathPilotState,
  resourceId: string,
  eventType: ResourceEvent['eventType'],
  helpful?: boolean,
): MathPilotState['resourceEvents'] {
  const event: ResourceEvent = {
    id: `re-${resourceId}-${Date.now()}`,
    resourceId,
    eventType,
    helpful,
    createdAt: new Date().toISOString(),
  }
  return [event, ...(state.resourceEvents ?? [])].slice(0, 200)
}

export function updateResourceEffectiveness(
  state: MathPilotState,
  resourceId: string,
  input: AttemptInput,
): MathPilotState {
  const resource = state.resources[resourceId]
  if (!resource) return state

  const delta = input.correct && input.hintCount === 0 ? 0.03 : input.correct ? 0.01 : -0.04
  const score = Math.min(0.95, Math.max(0.15, resource.effectivenessScore + delta))

  return {
    ...state,
    resources: {
      ...state.resources,
      [resourceId]: {
        ...resource,
        effectivenessScore: score,
        notes:
          score >= resource.effectivenessScore
            ? 'Recent sessions improved outcomes.'
            : 'Recent sessions did not improve outcomes — try a different source.',
      },
    },
  }
}

export function topResourcesForSkill(state: MathPilotState, skillId: string, limit = 3) {
  return Object.values(state.resources)
    .filter((r) => r.skillIds.includes(skillId))
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
    .slice(0, limit)
}

export function recordResourceHelpfulness(state: MathPilotState, resourceId: string, helpful: boolean): MathPilotState {
  const resource = state.resources[resourceId]
  if (!resource) return state
  const delta = helpful ? 0.04 : -0.06
  const score = Math.min(0.95, Math.max(0.15, resource.effectivenessScore + delta))
  return {
    ...state,
    resources: {
      ...state.resources,
      [resourceId]: {
        ...resource,
        effectivenessScore: score,
        notes: helpful ? 'Marked helpful — ranked higher for this skill.' : 'Marked not helpful — demoted in suggestions.',
      },
    },
    resourceEvents: appendResourceEvent(state, resourceId, helpful ? 'helpful' : 'not_helpful', helpful),
    changelog: [
      `${new Date().toISOString()}: Resource "${resource.title}" marked ${helpful ? 'helpful' : 'not helpful'}.`,
      ...state.changelog,
    ],
  }
}

export function recordResourceUsage(state: MathPilotState, resourceId: string, completedPostCheck: boolean) {
  const resource = state.resources[resourceId]
  if (!resource) return state
  const next = updateResourceEffectiveness(state, resourceId, {
    problemId: 'video-check',
    skillIds: resource.skillIds,
    answer: completedPostCheck ? 'yes' : 'no',
    correct: completedPostCheck,
    mode: 'guided',
    hintCount: 0,
    seconds: 300,
    mixed: false,
    delayed: false,
  })
  return {
    ...next,
    resourceEvents: appendResourceEvent(next, resourceId, completedPostCheck ? 'post_check' : 'watched', completedPostCheck),
  }
}
