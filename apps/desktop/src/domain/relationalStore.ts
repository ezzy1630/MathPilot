import type { MathPilotState } from './types'

const PREFIX = 'mathpilot.relational.v1'

function key(table: string) {
  return `${PREFIX}.${table}`
}

/** Web/dev fallback mirroring SQLite table layout in localStorage. */
export function saveRelationalLocal(state: MathPilotState) {
  localStorage.setItem(
    key('settings'),
    JSON.stringify({
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
      codexSessions: state.codexSessions,
      sessionsSinceMaintenance: state.sessionsSinceMaintenance,
      preferences: state.preferences,
      coachInsight: state.coachInsight,
      studyPlan: state.studyPlan,
      codexHint: state.codexHint,
      postDiagnosticPending: state.postDiagnosticPending,
      continuingDiagnosticPending: state.continuingDiagnosticPending,
      continuingDiagnosticCuratorRan: state.continuingDiagnosticCuratorRan,
      homeworkClusterLastRun: state.homeworkClusterLastRun,
      mapHighlightSkillIds: state.mapHighlightSkillIds,
      mapViewMode: state.mapViewMode,
      activeVideo: state.activeVideo,
      workedExamples: state.workedExamples,
      developerState: state.developerState,
      syllabus: state.syllabus,
      syllabusMapping: state.syllabusMapping,
      codeChangeProposals: state.codeChangeProposals,
    }),
  )
  localStorage.setItem(key('mastery'), JSON.stringify(state.mastery))
  localStorage.setItem(key('review'), JSON.stringify(state.reviewQueue))
  localStorage.setItem(key('problems'), JSON.stringify(state.problems))
  localStorage.setItem(key('attempts'), JSON.stringify(state.attempts))
  localStorage.setItem(key('homework'), JSON.stringify(state.homeworkAnalyses))
  localStorage.setItem(key('changelog'), JSON.stringify(state.changelog))
  if (Object.keys(state.skills).length > 0) {
    localStorage.setItem(key('skills'), JSON.stringify(state.skills))
  }
}

export function loadRelationalLocal(): Partial<MathPilotState> | null {
  const mastery = localStorage.getItem(key('mastery'))
  if (!mastery) return null
  const settings = JSON.parse(localStorage.getItem(key('settings')) ?? '{}') as Partial<MathPilotState>
  const skillsRaw = localStorage.getItem(key('skills'))
  return {
    ...settings,
    mastery: JSON.parse(mastery),
    reviewQueue: JSON.parse(localStorage.getItem(key('review')) ?? '[]'),
    problems: JSON.parse(localStorage.getItem(key('problems')) ?? '{}'),
    attempts: JSON.parse(localStorage.getItem(key('attempts')) ?? '[]'),
    homeworkAnalyses: JSON.parse(localStorage.getItem(key('homework')) ?? '[]'),
    changelog: JSON.parse(localStorage.getItem(key('changelog')) ?? '[]'),
    skills: skillsRaw ? JSON.parse(skillsRaw) : undefined,
  }
}
