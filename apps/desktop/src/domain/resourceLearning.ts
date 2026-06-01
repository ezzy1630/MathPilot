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

export type ResourceHelpfulness = 'yes' | 'kind_of' | 'no'

export function recordResourceHelpfulness(
  state: MathPilotState,
  resourceId: string,
  helpfulness: ResourceHelpfulness | boolean,
): MathPilotState {
  const resource = state.resources[resourceId]
  if (!resource) return state
  const level: ResourceHelpfulness =
    typeof helpfulness === 'boolean' ? (helpfulness ? 'yes' : 'no') : helpfulness
  const delta = level === 'yes' ? 0.04 : level === 'kind_of' ? 0.01 : -0.06
  const score = Math.min(0.95, Math.max(0.15, resource.effectivenessScore + delta))
  const notes =
    level === 'yes'
      ? 'Marked helpful — ranked higher for this skill.'
      : level === 'kind_of'
        ? 'Marked kind of helpful — slight boost.'
        : 'Marked not helpful — demoted in suggestions.'
  return {
    ...state,
    resources: {
      ...state.resources,
      [resourceId]: {
        ...resource,
        effectivenessScore: score,
        notes,
      },
    },
    resourceEvents: appendResourceEvent(
      state,
      resourceId,
      level === 'yes' ? 'helpful' : level === 'no' ? 'not_helpful' : 'watched',
      level === 'yes' ? true : level === 'no' ? false : undefined,
    ),
    changelog: [
      `${new Date().toISOString()}: Resource "${resource.title}" marked ${level === 'kind_of' ? 'kind of helpful' : level === 'yes' ? 'helpful' : 'not helpful'}.`,
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
