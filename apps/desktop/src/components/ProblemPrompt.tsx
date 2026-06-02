import { MathText } from './MathText'
import type { Problem } from '../domain/types'

interface ProblemPromptProps {
  prompt: string
  promptLatex?: string
  problem?: Pick<Problem, 'prompt' | 'promptLatex'>
  className?: string
}

export function ProblemPrompt({ prompt, promptLatex, problem, className }: ProblemPromptProps) {
  const text = problem?.prompt ?? prompt
  const latex = problem?.promptLatex ?? promptLatex

  return (
    <MathText
      text={text}
      latex={latex}
      className={className ?? 'prompt'}
      ariaLabel={text}
    />
  )
}
