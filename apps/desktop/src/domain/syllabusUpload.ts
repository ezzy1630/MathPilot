import type { CourseFocus, MathPilotState } from './types'
import { defaultSyllabus, type SyllabusAlignment } from './syllabus'

export interface ParsedSyllabusLine {
  week: number
  topic: string
  skillIds: string[]
}

const TOPIC_SKILL_MAP: Record<string, string[]> = {
  limit: ['limits_intro', 'continuity'],
  derivative: ['derivative_rules_basic', 'chain_rule'],
  chain: ['chain_rule'],
  integral: ['antiderivatives', 'u_substitution'],
  integration: ['integration_by_parts', 'u_substitution'],
  series: ['series_intro', 'series_test_selection'],
  taylor: ['taylor_series', 'taylor_polynomials'],
  related: ['related_rates'],
  optimization: ['optimization'],
  volume: ['volume_of_revolution'],
}

export function parseSyllabusText(text: string, focus: CourseFocus): SyllabusAlignment {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const items: ParsedSyllabusLine[] = []
  let week = 1

  for (const line of lines) {
    const weekMatch = line.match(/week\s*(\d+)/i)
    if (weekMatch) week = Number(weekMatch[1])
    const topic = line.replace(/week\s*\d+[:\-.]?\s*/i, '').trim() || line
    const lower = topic.toLowerCase()
    const skillIds = Object.entries(TOPIC_SKILL_MAP)
      .filter(([key]) => lower.includes(key))
      .flatMap(([, ids]) => ids)
    items.push({
      week,
      topic,
      skillIds: skillIds.length ? [...new Set(skillIds)] : ['chain_rule'],
    })
    week += 1
  }

  if (!items.length) return defaultSyllabus(focus)

  return {
    course: focus,
    items: items.map(({ week, topic, skillIds }) => ({ week, topic, skillIds })),
    currentWeek: 1,
  }
}

export function applySyllabusUpload(state: MathPilotState, text: string): MathPilotState {
  const syllabus = parseSyllabusText(text, state.currentFocus)
  return {
    ...state,
    syllabus,
    changelog: [
      `${new Date().toISOString()}: Syllabus uploaded — ${syllabus.items.length} topics mapped.`,
      ...state.changelog,
    ],
  }
}
