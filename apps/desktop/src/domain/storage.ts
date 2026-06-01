import { createInitialState } from './learningEngine'
import type { CourseFocus, MathPilotState } from './types'

const STORAGE_KEY = 'mathpilot.local.sqlite-facade.v1'

export function loadState(defaultFocus: CourseFocus = 'Calculus 1'): MathPilotState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return createInitialState(defaultFocus)
  try {
    return JSON.parse(raw) as MathPilotState
  } catch {
    return createInitialState(defaultFocus)
  }
}

export function saveState(state: MathPilotState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetState(focus: CourseFocus) {
  const state = createInitialState(focus)
  saveState(state)
  return state
}

export function exportState(state: MathPilotState) {
  return new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
}
