import { describe, expect, it } from 'vitest'
import { clusterHomeworkDeterministic } from './homeworkClusterDeterministic'
import { createInitialState } from './learningEngine'

describe('homeworkClusterDeterministic', () => {
  it('clusters recurring tags and attaches repair recommendations', () => {
    const state = createInitialState('Calculus 1')
    const base = {
      detectedTopic: 'Chain rule',
      problemText: 'Differentiate',
      extractedWorkSummary: 'Missed inner',
      correctness: 'incorrect' as const,
      mistakeTags: ['chain_rule:missing_inner_derivative'],
      skillsAffected: ['chain_rule'],
      feedbackSummary: 'Inner derivative missing.',
      rawImageSaved: false,
    }

    const withAnalyses = {
      ...state,
      homeworkAnalyses: [
        {
          id: 'h2',
          createdAt: new Date().toISOString(),
          ...base,
        },
        {
          id: 'h1',
          createdAt: new Date(Date.now() - 60_000).toISOString(),
          ...base,
        },
      ],
    }

    const result = clusterHomeworkDeterministic(withAnalyses)
    expect(result.mistakePatterns['chain_rule:missing_inner_derivative']?.count).toBeGreaterThanOrEqual(2)
    expect(result.homeworkAnalyses[0].repairRecommendation?.skillId).toBe('chain_rule')
    expect(result.summaryBullets.length).toBeGreaterThan(0)
  })
})
