import { describe, expect, it } from 'vitest'
import { attemptModeForActivity } from './activityAttemptMode'

describe('activity attempt mode', () => {
  it('preserves the behavioral mode used for mastery updates', () => {
    expect(attemptModeForActivity('diagnostic')).toBe('diagnostic')
    expect(attemptModeForActivity('mixed_review')).toBe('review')
    expect(attemptModeForActivity('independent_practice')).toBe('independent')
    expect(attemptModeForActivity('homework_review')).toBe('homework')
    expect(attemptModeForActivity('guided_practice')).toBe('guided')
    expect(attemptModeForActivity('resource_watch')).toBe('guided')
    expect(attemptModeForActivity('quick_repair')).toBe('guided')
  })
})
