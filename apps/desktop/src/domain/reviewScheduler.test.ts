import { describe, expect, it } from 'vitest'
import { BASE_INTERVALS, buildReviewItemUpdate, nextReviewIntervalDays, reviewPriority } from './reviewScheduler'

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
      { retentionScore: 0.82 },
    )
    expect(long).toBeGreaterThan(short)
    expect(long).toBeGreaterThanOrEqual(BASE_INTERVALS[2])
  })

  it('shortens interval when retention score is low', () => {
    const interval = nextReviewIntervalDays(
      {
        problemId: 'p',
        skillIds: ['chain_rule'],
        answer: 'x',
        correct: true,
        mode: 'review',
        hintCount: 0,
        seconds: 70,
        mixed: true,
        delayed: true,
      },
      0.75,
      { retentionScore: 0.35 },
    )
    expect(interval).toBeLessThanOrEqual(BASE_INTERVALS[1])
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

  it('boosts priority for overdue review misses', () => {
    const overdueMiss = reviewPriority(
      {
        problemId: 'p',
        skillIds: ['chain_rule'],
        answer: '',
        correct: false,
        mode: 'review',
        hintCount: 0,
        seconds: 90,
        mixed: false,
        delayed: false,
      },
      0.5,
      {
        existingItem: {
          id: 'r1',
          skillId: 'chain_rule',
          due: '2020-01-01',
          intervalDays: 7,
          priority: 50,
          reason: 'due',
        },
        today: '2026-06-01',
      },
    )
    expect(overdueMiss).toBeGreaterThanOrEqual(96)
  })

  it('builds review item updates with adaptive interval', () => {
    const item = buildReviewItemUpdate(
      'chain_rule',
      {
        problemId: 'p',
        skillIds: ['chain_rule'],
        answer: 'x',
        correct: true,
        mode: 'review',
        hintCount: 0,
        seconds: 70,
        mixed: true,
        delayed: true,
      },
      0.82,
      0.8,
      [],
    )
    expect(item.intervalDays).toBeGreaterThan(1)
    expect(item.due).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
