import { describe, expect, it } from 'vitest'
import { createInitialState } from './learningEngine'
import { analyzeHomeworkDeep, splitHomeworkProblems } from './homeworkAnalysis'
import {
  applyHomeworkLearningUpdates,
  chooseRepairRecommendation,
  inferStepFeedback,
} from './homeworkLearningBridge'

describe('homeworkLearningBridge', () => {
  it('updates mastery and review queue from homework evidence', () => {
    const state = createInitialState('Calculus 1')
    const before = state.mastery.related_rates?.masteryScore ?? 0.5
    const next = applyHomeworkLearningUpdates(state, {
      correctness: 'incorrect',
      mistakeTags: ['setup:modeling_missing_equation'],
      skillsAffected: ['related_rates'],
      extractedWorkSummary: 'Missing relationship equation.',
    })
    expect(next.attempts.length).toBeGreaterThan(state.attempts.length)
    expect(next.mastery.related_rates.masteryScore).toBeLessThan(before)
    expect(next.reviewQueue.some((r) => r.skillId === 'related_rates')).toBe(true)
    expect(next.mistakePatterns['setup:modeling_missing_equation']?.count).toBeGreaterThan(0)
  })

  it('recommends repair on weakest affected skill', () => {
    const state = createInitialState('Calculus 1')
    state.mastery.chain_rule = { ...state.mastery.chain_rule, masteryScore: 0.2 }
    state.mastery.related_rates = { ...state.mastery.related_rates, masteryScore: 0.55 }
    const rec = chooseRepairRecommendation(state, ['related_rates', 'chain_rule'], ['setup:error'])
    expect(rec?.skillId).toBe('chain_rule')
  })

  it('generates step feedback when Codex omits it', () => {
    const steps = inferStepFeedback({
      correctness: 'incorrect',
      mistakeTags: ['setup:error'],
      skillsAffected: ['chain_rule'],
      extractedWorkSummary: 'Forgot inner derivative.',
    })
    expect(steps.length).toBeGreaterThanOrEqual(3)
    expect(steps.some((s) => !s.correct)).toBe(true)
  })
})

describe('homeworkAnalysis', () => {
  it('splits numbered homework problems from OCR text', () => {
    const text = '1. Find the limit of x^2\n2. Differentiate sin(x)\n3. Integrate e^x'
    const parts = splitHomeworkProblems(text)
    expect(parts.length).toBe(3)
    expect(parts[0].label).toBe('Problem 1')
    expect(parts[1].problemText).toContain('Differentiate')
  })

  it('analyzes text with keyword fallback when Codex unavailable', async () => {
    const state = createInitialState('Calculus 1')
    const { analysis, state: next } = await analyzeHomeworkDeep(state, {
      problemText: 'related rates balloon problem',
    })
    expect(analysis.detectedTopic).toBe('Related rates')
    expect(analysis.feedbackSummary).toContain('relationship')
    expect(analysis.stepFeedback?.length).toBeGreaterThan(0)
    expect(analysis.repairRecommendation?.skillId).toBe('related_rates')
    expect(next.attempts.length).toBeGreaterThan(state.attempts.length)
  })
})
