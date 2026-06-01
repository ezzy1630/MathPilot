import { describe, expect, it } from 'vitest'
import { Rating } from 'ts-fsrs'
import { attemptToFsrsGrade, scheduleFsrsReview } from './fsrsSchedule'

describe('fsrsSchedule', () => {
  it('schedules longer interval after easy delayed mixed success', () => {
    const grade = attemptToFsrsGrade({
      correct: true,
      hintCount: 0,
      seconds: 40,
      delayed: true,
      mixed: true,
    })
    expect(grade).toBe(Rating.Easy)
    const { intervalDays } = scheduleFsrsReview(undefined, grade)
    expect(intervalDays).toBeGreaterThanOrEqual(1)
  })

  it('resets interval on again', () => {
    const first = scheduleFsrsReview(undefined, Rating.Good)
    const again = scheduleFsrsReview(first.card, Rating.Again)
    expect(again.intervalDays).toBeLessThanOrEqual(first.intervalDays)
  })
})
