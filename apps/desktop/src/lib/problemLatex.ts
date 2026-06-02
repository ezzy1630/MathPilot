import { promptToLatex } from './promptToLatex'
import type { Problem } from '../domain/types'

function latexForText(text: string | undefined): string | undefined {
  if (!text?.trim()) return undefined
  return promptToLatex(text)
}

function latexForStrings(strings: string[] | undefined): string[] | undefined {
  if (!strings?.length) return undefined
  return strings.map((item) => promptToLatex(item))
}

/** Fill optional LaTeX display fields from plain-text problem content. */
export function enrichProblemWithLatex(problem: Problem): Problem {
  return {
    ...problem,
    promptLatex: problem.promptLatex ?? latexForText(problem.prompt),
    choiceLatex: problem.choiceLatex ?? latexForStrings(problem.choices),
    workedExampleLatex: problem.workedExampleLatex ?? latexForStrings(problem.workedExample),
    hintSequenceLatex: problem.hintSequenceLatex ?? latexForStrings(problem.hintSequence),
  }
}

export function enrichProblemsRecord(problems: Record<string, Problem>): Record<string, Problem> {
  const enriched: Record<string, Problem> = {}
  for (const [id, problem] of Object.entries(problems)) {
    enriched[id] = enrichProblemWithLatex(problem)
  }
  return enriched
}

export function enrichProblems(problems: Problem[]): Problem[] {
  return problems.map(enrichProblemWithLatex)
}
