import { applyDecayIfStale, createInitialState } from './learningEngine'
import { mergeResourceCatalog } from './resourceResolver'
import type { CourseFocus, MathPilotState } from './types'

/** Merge DB snapshot with live course graph (skills/resources). */
export function hydrateState(partial: Partial<MathPilotState> & { currentFocus?: CourseFocus }): MathPilotState {
  const focus = partial.currentFocus ?? 'Calculus 1'
  const base = createInitialState(focus)

  const merged = mergeResourceCatalog({
    ...base,
    ...partial,
    currentFocus: focus,
    skills: base.skills,
    resources: { ...base.resources, ...(partial.resources ?? {}) },
    mastery: Object.fromEntries(
      Object.entries({ ...base.mastery, ...(partial.mastery ?? {}) }).map(([id, record]) => [
        id,
        applyDecayIfStale(record),
      ]),
    ),
    problems: { ...base.problems, ...(partial.problems ?? {}) },
    attempts: partial.attempts ?? [],
    reviewQueue: partial.reviewQueue ?? [],
    mistakePatterns: partial.mistakePatterns ?? {},
    resourceEvents: partial.resourceEvents ?? [],
    aiCalls: partial.aiCalls ?? [],
    homeworkAnalyses: partial.homeworkAnalyses ?? [],
    changelog: partial.changelog ?? base.changelog,
    diagnostic: partial.diagnostic,
    maintenanceRuns: partial.maintenanceRuns,
    overrides: partial.overrides,
    quickRepair: partial.quickRepair,
    dailySession: partial.dailySession,
    developerModeEnabled: partial.developerModeEnabled,
    sessionPace: partial.sessionPace,
    onboarded: partial.onboarded ?? false,
    advancedMode: partial.advancedMode ?? false,
    profileName: partial.profileName ?? base.profileName,
    preferences: partial.preferences,
    studyPlan: partial.studyPlan,
    syllabus: partial.syllabus,
    mapViewMode: partial.mapViewMode,
    codexSessions: partial.codexSessions,
    sessionsSinceMaintenance: partial.sessionsSinceMaintenance,
  })

  return merged
}
