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
} {
  if (mode === 'diagnostic') {
    return {
      message: result.correct ? 'Correct.' : 'Incorrect.',
      tone: result.correct ? 'correct' : 'wrong',
      nextEscalation: 0,
      nextSteps: result.correct
        ? ['Continue to the next diagnostic question.']
        : ['Continue — weak areas will be scheduled for repair.'],
    }
  }

  const nextSteps: string[] = []

  if (result.correct) {
    if (mode === 'review' && hintCount === 0) {
      return {
        message: 'Strong retrieval — review interval extended.',
        tone: 'correct',
        nextEscalation: 0,
        nextSteps: ['Return to Continue when you are ready for the next item.'],
      }
    }
    return {
      message: result.feedback,
      tone: 'correct',
      nextEscalation: 0,
      nextSteps: ['Try a similar problem without hints to lock in the skill.'],
    }
  }

  if (escalationLevel === 0) {
    nextSteps.push('Name the method you chose and why it fits the problem structure.')
    nextSteps.push('Re-read the prompt and underline given vs. unknown quantities.')
    return {
      message: `${result.feedback} Hint: identify whether the error is setup, algebra, or method.`,
      tone: 'almost',
      nextEscalation: 1,
      nextSteps,
    }
  }

  if (escalationLevel === 1) {
    nextSteps.push('Write the first line only — do not simplify yet.')
    nextSteps.push('Compare units / notation against the worked example.')
    return {
      message: `${result.feedback} Partial guidance: re-check the first line against the prompt before simplifying.`,
      tone: 'almost',
      nextEscalation: 2,
      nextSteps,
    }
  }

  nextSteps.push('Open a similar example and follow it line by line.')
  nextSteps.push('Start quick repair for this skill if the method still feels unclear.')
  return {
    message: `${result.feedback} Full feedback: compare your work to a worked example or start quick repair for this skill.`,
    tone: 'wrong',
    nextEscalation: 2,
    nextSteps,
  }
}
