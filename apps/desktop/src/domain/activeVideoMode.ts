import { recordResourceUsage } from './resourceLearning'
import type { MathPilotState } from './types'

export interface ActiveVideoSession {
  resourceId: string
  skillIds: string[]
  startedAt: string
  postCheckProblemId?: string
  postCheckPassed?: boolean
}

export function startActiveVideo(state: MathPilotState, resourceId: string): MathPilotState {
  const resource = state.resources[resourceId]
  if (!resource) return state
  return {
    ...state,
    activeVideo: {
      resourceId,
      skillIds: resource.skillIds,
      startedAt: new Date().toISOString(),
    },
    changelog: [`${new Date().toISOString()}: Active video started — ${resource.title}.`, ...state.changelog],
  }
}

export function completeActiveVideoPostCheck(state: MathPilotState, passed: boolean): MathPilotState {
  const session = state.activeVideo
  if (!session) return state
  let next: MathPilotState = {
    ...state,
    activeVideo: undefined,
    changelog: [
      `${new Date().toISOString()}: Active video post-check ${passed ? 'passed' : 'needs review'}.`,
      ...state.changelog,
    ],
  }
  if (passed) {
    next = recordResourceUsage(next, session.resourceId, true)
  }
  return next
}
