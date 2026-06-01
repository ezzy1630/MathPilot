import type { CourseFocus, MathPilotState } from './types'

export interface SyllabusItem {
  week: number
  topic: string
  skillIds: string[]
}

export interface SyllabusAlignment {
  course: CourseFocus
  items: SyllabusItem[]
  currentWeek?: number
}

const DEFAULT_SYLLABUS: Record<CourseFocus, SyllabusItem[]> = {
  'Calculus 1': [
    { week: 1, topic: 'Limits', skillIds: ['limits_intro', 'continuity'] },
    { week: 2, topic: 'Derivatives', skillIds: ['derivative_definition', 'derivative_rules_basic'] },
    { week: 3, topic: 'Chain rule', skillIds: ['chain_rule', 'implicit_differentiation'] },
    { week: 4, topic: 'Applications', skillIds: ['related_rates', 'optimization'] },
    { week: 5, topic: 'Integration', skillIds: ['antiderivatives', 'u_substitution'] },
  ],
  'Calculus 2': [
    { week: 1, topic: 'Integration techniques', skillIds: ['integration_by_parts', 'trig_substitution'] },
    { week: 2, topic: 'Series', skillIds: ['series_intro', 'series_test_selection'] },
    { week: 3, topic: 'Power series', skillIds: ['power_series', 'taylor_series'] },
  ],
}

export function defaultSyllabus(focus: CourseFocus): SyllabusAlignment {
  return { course: focus, items: DEFAULT_SYLLABUS[focus], currentWeek: 1 }
}

export function syllabusSkillBoost(state: MathPilotState): string[] {
  const syllabus = state.syllabus ?? defaultSyllabus(state.currentFocus)
  const week = syllabus.currentWeek ?? 1
  const item = syllabus.items.find((i) => i.week === week)
  return item?.skillIds ?? []
}
