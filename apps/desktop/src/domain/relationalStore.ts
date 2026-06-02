import type { MathPilotState } from './types'

const PREFIX = 'mathpilot.relational.v1'

function key(table: string) {
  return `${PREFIX}.${table}`
}

function parseStoredJson<T>(table: string, fallback: T): T | null {
  const raw = localStorage.getItem(key(table))
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
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
  if (!localStorage.getItem(key('mastery'))) return null
  const settings = parseStoredJson<Partial<MathPilotState>>('settings', {})
  const mastery = parseStoredJson<MathPilotState['mastery']>('mastery', {})
  const reviewQueue = parseStoredJson<MathPilotState['reviewQueue']>('review', [])
  const problems = parseStoredJson<MathPilotState['problems']>('problems', {})
  const attempts = parseStoredJson<MathPilotState['attempts']>('attempts', [])
  const homeworkAnalyses = parseStoredJson<MathPilotState['homeworkAnalyses']>('homework', [])
  const changelog = parseStoredJson<MathPilotState['changelog']>('changelog', [])
  const skillsRaw = localStorage.getItem(key('skills'))
  const skills = skillsRaw === null ? undefined : parseStoredJson<MathPilotState['skills']>('skills', {})

  if (!settings || !mastery || !reviewQueue || !problems || !attempts || !homeworkAnalyses || !changelog) {
    return null
  }
  if (skillsRaw !== null && !skills) return null

  return {
    ...settings,
    mastery,
    reviewQueue,
    problems,
    attempts,
    homeworkAnalyses,
    changelog,
    skills: skills ?? undefined,
  }
}
