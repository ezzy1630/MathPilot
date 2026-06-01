import { describe, expect, it } from 'vitest'
import { feedbackForMode } from './feedbackByMode'
import type { CheckAnswerResult } from './mathEngine'

const stubResult = (correct: boolean, feedback: string): CheckAnswerResult => ({
  correct,
  feedback,
  method: 'text',
  confidence: 0.5,
  normalizedExpected: '',
  normalizedActual: '',
  mistakeTags: [],
})

describe('feedbackByMode', () => {
  it('returns minimal diagnostic feedback without teaching', () => {
    const correct = feedbackForMode('diagnostic', stubResult(true, 'Nice chain rule work.'), 0)
    const wrong = feedbackForMode('diagnostic', stubResult(false, 'Missing inner derivative.'), 0, 2)

    expect(correct.message).toBe('Correct.')
    expect(wrong.message).toBe('Incorrect.')
    expect(wrong.message).not.toContain('Missing inner derivative')
  })

  it('consolidates wrong-answer feedback into a single next move', () => {
    const wrong = feedbackForMode('guided', stubResult(false, 'Check the chain rule factor.'), 0, 0)
    expect(wrong.nextMove).toContain('Check the chain rule factor.')
    expect(wrong.nextMove).toContain('Name the method you chose')
    expect(wrong.nextMove).not.toContain('\n\n')
  })
})
