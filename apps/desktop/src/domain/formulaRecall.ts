import { enrichProblemWithLatex } from '../lib/problemLatex'
import { FORMULA_CATALOG } from './formulaRecallCatalog'
import type { ActivityKind, MathPilotState, Problem } from './types'

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

export function shouldIncludeFormulaRecallPhase(state: MathPilotState): boolean {
  return Object.values(state.mastery).some(
    (m) =>
      state.skills[m.skillId] &&
      m.masteryScore < 0.78 &&
      FORMULA_CATALOG.some((f) => f.skillId === m.skillId),
  )
}

export function weakestFormulaSkillId(state: MathPilotState): string | undefined {
  return Object.values(state.mastery)
    .filter(
      (m) =>
        state.skills[m.skillId] &&
        m.masteryScore < 0.78 &&
        FORMULA_CATALOG.some((f) => f.skillId === m.skillId),
    )
    .sort((a, b) => a.masteryScore - b.masteryScore)[0]?.skillId
}

export function buildFormulaRecallProblem(
  state: MathPilotState,
  skillId?: string,
  seed = Date.now(),
): { state: MathPilotState; problem: Problem } {
  const formula =
    (skillId ? FORMULA_CATALOG.find((f) => f.skillId === skillId) : undefined) ??
    nextFormulaRecall(state) ??
    FORMULA_CATALOG[0]
  const targetSkill = formula.skillId
  const id = `session-formula-${targetSkill}-${seed}`
  const problem = enrichProblemWithLatex({
    id,
    title: `Formula recall: ${state.skills[targetSkill]?.name ?? targetSkill}`,
    prompt: formula.prompt,
    skillIds: [targetSkill],
    difficulty: 0.32,
    mode: 'formula_recall' as ActivityKind,
    answerType: 'text',
    expectedAnswer: formula.expected,
    hintSequence: ['State the rule in words or standard notation.'],
    source: 'formula_recall_session',
    verificationStatus: 'verified',
  })
  return { state: { ...state, problems: { ...state.problems, [id]: problem } }, problem }
}

export function checkFormulaAnswer(expected: string, actual: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')
  const a = norm(actual)
  const e = norm(expected)
  return e.includes(a.slice(0, 12)) || a.includes(e.slice(0, 12)) || (a.length > 4 && e.includes(a.slice(0, 8)))
}
