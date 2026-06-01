import type { CourseFocus, MathPilotState } from './types'
import { defaultSyllabus, type SyllabusAlignment } from './syllabus'

export interface ParsedSyllabusLine {
  week: number
  topic: string
  skillIds: string[]
}

export interface SyllabusExtractResult extends SyllabusAlignment {
  extractedDates: string[]
  extractedExams: string[]
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

function extractDates(text: string): string[] {
  const matches = [
    ...text.matchAll(/\b(?:\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})\b/gi),
  ]
  return [...new Set(matches.map((match) => match[0]))]
}

function extractExams(text: string): string[] {
  const matches = [...text.matchAll(/\b(?:midterm|final exam|exam \d|quiz \d|test \d)\b[^.\n]*/gi)]
  return [...new Set(matches.map((match) => match[0].trim()))]
}

export function parseSyllabusText(text: string, focus: CourseFocus): SyllabusExtractResult {
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

  const extractedDates = extractDates(text)
  const extractedExams = extractExams(text)

  if (!items.length) {
    const fallback = defaultSyllabus(focus)
    return { ...fallback, extractedDates, extractedExams }
  }

  return {
    course: focus,
    items: items.map(({ week, topic, skillIds }) => ({ week, topic, skillIds })),
    currentWeek: 1,
    extractedDates,
    extractedExams,
  }
}

export function applySyllabusUpload(state: MathPilotState, text: string): MathPilotState {
  const parsed = parseSyllabusText(text, state.currentFocus)
  const syllabus = {
    course: parsed.course,
    items: parsed.items,
    currentWeek: parsed.currentWeek,
    extractedDates: parsed.extractedDates,
    extractedExams: parsed.extractedExams,
  }
  const syllabusMapping = parsed.items.map((item) => ({
    topic: item.topic,
    skillIds: item.skillIds,
    accepted: true,
    source: 'upload' as const,
  }))
  return {
    ...state,
    syllabus,
    syllabusMapping,
    changelog: [
      `${new Date().toISOString()}: Syllabus uploaded — ${syllabus.items.length} topics mapped.`,
      ...state.changelog,
    ],
  }
}
