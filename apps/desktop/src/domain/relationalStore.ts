import type { MathPilotState } from './types'

const PREFIX = 'mathpilot.relational.v1'

function key(table: string) {
  return `${PREFIX}.${table}`
}

/** Web/dev fallback mirroring SQLite table layout in localStorage. */
export function saveRelationalLocal(state: MathPilotState) {
  localStorage.setItem(key('settings'), JSON.stringify({
    profileName: state.profileName,
    currentFocus: state.currentFocus,
    onboarded: state.onboarded,
    advancedMode: state.advancedMode,
    sessionPace: state.sessionPace,
    developerModeEnabled: state.developerModeEnabled,
    mistakePatterns: state.mistakePatterns,
    resources: state.resources,
    aiCalls: state.aiCalls,
    maintenanceRuns: state.maintenanceRuns,
    overrides: state.overrides,
    quickRepair: state.quickRepair,
    dailySession: state.dailySession,
    diagnostic: state.diagnostic,
    resourceEvents: state.resourceEvents,
  }))
  localStorage.setItem(key('mastery'), JSON.stringify(state.mastery))
  localStorage.setItem(key('review'), JSON.stringify(state.reviewQueue))
  localStorage.setItem(key('problems'), JSON.stringify(state.problems))
  localStorage.setItem(key('attempts'), JSON.stringify(state.attempts))
  localStorage.setItem(key('homework'), JSON.stringify(state.homeworkAnalyses))
  localStorage.setItem(key('changelog'), JSON.stringify(state.changelog))
}

export function loadRelationalLocal(): Partial<MathPilotState> | null {
  const mastery = localStorage.getItem(key('mastery'))
  if (!mastery) return null
  const settings = JSON.parse(localStorage.getItem(key('settings')) ?? '{}') as Partial<MathPilotState>
  return {
    ...settings,
    mastery: JSON.parse(mastery),
    reviewQueue: JSON.parse(localStorage.getItem(key('review')) ?? '[]'),
    problems: JSON.parse(localStorage.getItem(key('problems')) ?? '{}'),
    attempts: JSON.parse(localStorage.getItem(key('attempts')) ?? '[]'),
    homeworkAnalyses: JSON.parse(localStorage.getItem(key('homework')) ?? '[]'),
    changelog: JSON.parse(localStorage.getItem(key('changelog')) ?? '[]'),
  }
}
