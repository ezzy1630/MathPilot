import { describe, expect, it } from 'vitest'
import { BASE_INTERVALS, nextReviewIntervalDays, reviewPriority } from './reviewScheduler'

describe('review scheduler', () => {
  it('uses longer intervals after delayed mixed success', () => {
    const short = nextReviewIntervalDays(
      {
        problemId: 'p1',
        skillIds: ['chain_rule'],
        answer: 'x',
        correct: true,
        mode: 'review',
        hintCount: 0,
        seconds: 80,
        mixed: false,
        delayed: false,
      },
      0.6,
    )
    const long = nextReviewIntervalDays(
      {
        problemId: 'p2',
        skillIds: ['chain_rule'],
        answer: 'x',
        correct: true,
        mode: 'review',
        hintCount: 0,
        seconds: 80,
        mixed: true,
        delayed: true,
      },
      0.8,
    )
    expect(long).toBeGreaterThan(short)
    expect(long).toBeGreaterThanOrEqual(BASE_INTERVALS[2])
  })

  it('prioritizes failed attempts highest', () => {
    const failed = reviewPriority(
      {
        problemId: 'p',
        skillIds: ['chain_rule'],
        answer: '',
        correct: false,
        mode: 'review',
        hintCount: 0,
        seconds: 90,
        mixed: true,
        delayed: true,
      },
      0.5,
    )
    const ok = reviewPriority(
      {
        problemId: 'p',
        skillIds: ['chain_rule'],
        answer: 'x',
        correct: true,
        mode: 'review',
        hintCount: 0,
        seconds: 90,
        mixed: true,
        delayed: true,
      },
      0.5,
    )
    expect(failed).toBeGreaterThan(ok)
  })
})
