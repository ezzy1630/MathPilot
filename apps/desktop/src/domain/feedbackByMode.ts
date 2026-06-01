import type { CheckAnswerResult } from './mathEngine'

type Mode = 'diagnostic' | 'guided' | 'independent' | 'review' | 'homework'

export function feedbackForMode(
  mode: Mode,
  result: CheckAnswerResult,
  hintCount: number,
  escalationLevel = 0,
): {
  message: string
  tone: 'correct' | 'almost' | 'wrong'
  nextEscalation: number
  nextSteps: string[]
  /** Single inspector body for wrong/almost answers (title stays "Next move"). */
  nextMove: string
} {
  const consolidate = (message: string, steps: string[]) => {
    const primary = steps[0]
    if (!primary) return message
    if (message.includes(primary)) return message
    return `${message} ${primary}`
  }
  if (mode === 'diagnostic') {
    const nextSteps = result.correct
      ? ['Continue to the next diagnostic question.']
      : ['Continue — weak areas will be scheduled for repair.']
    const message = result.correct ? 'Correct.' : 'Incorrect.'
    return {
      message,
      tone: result.correct ? 'correct' : 'wrong',
      nextEscalation: 0,
      nextSteps,
      nextMove: consolidate(message, nextSteps),
    }
  }

  const nextSteps: string[] = []

  if (result.correct) {
    if (mode === 'review' && hintCount === 0) {
      const message = 'Strong retrieval — review interval extended.'
      const nextSteps = ['Return to Continue when you are ready for the next item.']
      return {
        message,
        tone: 'correct',
        nextEscalation: 0,
        nextSteps,
        nextMove: message,
      }
    }
    const nextSteps = ['Try a similar problem without hints to lock in the skill.']
    return {
      message: result.feedback,
      tone: 'correct',
      nextEscalation: 0,
      nextSteps,
      nextMove: result.feedback,
    }
  }

  if (escalationLevel === 0) {
    nextSteps.push('Name the method you chose and why it fits the problem structure.')
    nextSteps.push('Re-read the prompt and underline given vs. unknown quantities.')
    const message = `${result.feedback} Hint: identify whether the error is setup, algebra, or method.`
    return {
      message,
      tone: 'almost',
      nextEscalation: 1,
      nextSteps,
      nextMove: consolidate(message, nextSteps),
    }
  }

  if (escalationLevel === 1) {
    nextSteps.push('Write the first line only — do not simplify yet.')
    nextSteps.push('Compare units / notation against the worked example.')
    const message = `${result.feedback} Partial guidance: re-check the first line against the prompt before simplifying.`
    return {
      message,
      tone: 'almost',
      nextEscalation: 2,
      nextSteps,
      nextMove: consolidate(message, nextSteps),
    }
  }

  nextSteps.push('Open a similar example and follow it line by line.')
  nextSteps.push('Start quick repair for this skill if the method still feels unclear.')
  const message = `${result.feedback} Full feedback: compare your work to a worked example or start quick repair for this skill.`
  return {
    message,
    tone: 'wrong',
    nextEscalation: 2,
    nextSteps,
    nextMove: consolidate(message, nextSteps),
  }
}
