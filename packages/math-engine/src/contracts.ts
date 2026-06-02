export interface CheckAnswerInput {
  expected: string
  actual: string
  variables?: string[]
  skillIds?: string[]
}

export interface CheckAnswerResult {
  correct: boolean
  method: 'symbolic' | 'numeric' | 'text' | 'ai_required'
  confidence: number
  normalizedExpected: string
  normalizedActual: string
  mistakeTags: string[]
  feedback: string
}

export interface MathEngineContract {
  checkAnswer(input: CheckAnswerInput): CheckAnswerResult
  checkAnswerAsync(input: CheckAnswerInput): Promise<CheckAnswerResult>
}
