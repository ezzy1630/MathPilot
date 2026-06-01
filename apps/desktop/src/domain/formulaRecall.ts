import { FORMULA_CATALOG } from './formulaRecallCatalog'
import type { MathPilotState } from './types'

export interface FormulaPrompt {
  id: string
  skillId: string
  prompt: string
  expected: string
}

export function allFormulaPrompts(): FormulaPrompt[] {
  return FORMULA_CATALOG
}

export function nextFormulaRecall(state: MathPilotState): FormulaPrompt | undefined {
  const weak = Object.values(state.mastery)
    .filter((m) => (m.masteryScore < 0.55 || m.masteryState === 'Needs Review') && state.skills[m.skillId])
    .sort((a, b) => a.masteryScore - b.masteryScore)[0]
  if (!weak) return FORMULA_CATALOG[0]
  return FORMULA_CATALOG.find((f) => f.skillId === weak.skillId) ?? FORMULA_CATALOG[0]
}

export function checkFormulaAnswer(expected: string, actual: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')
  const a = norm(actual)
  const e = norm(expected)
  return e.includes(a.slice(0, 12)) || a.includes(e.slice(0, 12)) || a.length > 4 && e.includes(a.slice(0, 8))
}
