import type { AttemptInput, ReviewItem } from './types'

export const BASE_INTERVALS = [1, 3, 7, 14, 30, 60] as const

/** FSRS-inspired interval selection from attempt quality and retention score. */
export function nextReviewIntervalDays(input: AttemptInput, masteryScore: number): number {
  if (!input.correct) return BASE_INTERVALS[0]
  if (input.hintCount > 0) return BASE_INTERVALS[0]

  let stability = 1
  if (input.delayed && input.mixed) stability += 2
  else if (input.mixed) stability += 1
  if (masteryScore >= 0.88) stability += 2
  else if (masteryScore >= 0.72) stability += 1
  if (input.seconds < 90 && input.hintCount === 0) stability += 1
  if (input.confidence !== undefined && input.confidence >= 4 && input.correct) stability += 1

  const idx = Math.min(BASE_INTERVALS.length - 1, Math.max(0, stability))
  return BASE_INTERVALS[idx]
}

export function reviewPriority(input: AttemptInput, masteryScore: number): number {
  if (!input.correct) {
    if (input.confidence !== undefined && input.confidence >= 4) return 98
    return 95
  }
  if (input.hintCount > 0) return 76
  if (masteryScore < 0.45) return 82
  if (input.delayed && input.mixed) return 42
  return 58
}

export function upsertReviewItem(queue: ReviewItem[], item: ReviewItem): ReviewItem[] {
  return [item, ...queue.filter((queued) => queued.skillId !== item.skillId)].sort(
    (a, b) => a.due.localeCompare(b.due) || b.priority - a.priority,
  )
}

export function dueReviews(queue: ReviewItem[], today = new Date().toISOString().slice(0, 10)): ReviewItem[] {
  return queue.filter((item) => item.due <= today).sort((a, b) => b.priority - a.priority)
}
