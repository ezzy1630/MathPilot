import { attemptToFsrsGrade, scheduleFsrsReview } from './fsrsAdapter'
import type { AttemptInput, ReviewItem } from './types'

export const BASE_INTERVALS = [1, 3, 7, 14, 30, 60] as const

export interface ReviewScheduleContext {
  retentionScore?: number
  existingItem?: ReviewItem
  today?: string
}

const todayIso = () => new Date().toISOString().slice(0, 10)

function daysBetween(from: string, to: string): number {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24))
}

/** FSRS-inspired stability index from attempt quality, retention, and prior schedule. */
export function reviewStabilityIndex(
  input: AttemptInput,
  masteryScore: number,
  retentionScore = masteryScore,
  existingItem?: ReviewItem,
  today = todayIso(),
): number {
  if (!input.correct) return 0

  let stability = 1

  if (input.delayed && input.mixed) stability += 2
  else if (input.mixed) stability += 1

  if (masteryScore >= 0.88) stability += 2
  else if (masteryScore >= 0.72) stability += 1
  else if (masteryScore < 0.45) stability -= 1

  if (retentionScore >= 0.82) stability += 1
  else if (retentionScore < 0.45) stability -= 1

  if (input.hintCount === 0 && input.seconds < 90) stability += 1
  else if (input.hintCount > 0) stability -= 2
  else if (input.seconds >= 180) stability -= 1

  if (input.confidence !== undefined && input.confidence >= 4 && input.correct) stability += 1
  if (input.confidence !== undefined && input.confidence <= 2 && input.correct) stability += 0.5

  if (existingItem) {
    const overdueDays = daysBetween(existingItem.due, today)
    if (overdueDays > 0 && input.correct) {
      stability += overdueDays >= 7 ? -1 : 1
    }
    if (existingItem.intervalDays >= 14) stability += 1
  }

  return Math.max(0, stability)
}

/** FSRS-style adaptive interval from attempt quality, retention score, and overdue state. */
export function nextReviewIntervalDays(
  input: AttemptInput,
  masteryScore: number,
  context: ReviewScheduleContext = {},
): number {
  const { retentionScore = masteryScore, existingItem, today = todayIso() } = context

  if (!input.correct) {
    if (existingItem && existingItem.due < today) return BASE_INTERVALS[0]
    if (input.hintCount >= 2) return BASE_INTERVALS[0]
    return BASE_INTERVALS[0]
  }

  if (input.hintCount > 0) return BASE_INTERVALS[0]

  const stability = reviewStabilityIndex(input, masteryScore, retentionScore, existingItem, today)
  const idx = Math.min(BASE_INTERVALS.length - 1, Math.max(0, Math.round(stability)))
  let interval: number = BASE_INTERVALS[idx]

  if (retentionScore < 0.4) interval = Math.min(interval, BASE_INTERVALS[1])
  if (retentionScore >= 0.85 && input.delayed && input.mixed) {
    interval = Math.min(BASE_INTERVALS[BASE_INTERVALS.length - 1], interval + 7)
  }

  if (existingItem && existingItem.due < today && input.correct) {
    interval = Math.max(BASE_INTERVALS[0], Math.min(interval, existingItem.intervalDays))
  }

  return interval
}

export function reviewPriority(
  input: AttemptInput,
  masteryScore: number,
  context: ReviewScheduleContext = {},
): number {
  const { retentionScore = masteryScore, existingItem, today = todayIso() } = context

  if (!input.correct) {
    if (input.confidence !== undefined && input.confidence >= 4) return 98
    if (existingItem && existingItem.due < today) return 96
    return 95
  }

  if (input.hintCount > 0) return 76
  if (masteryScore < 0.45) return 82
  if (retentionScore < 0.4) return 88
  if (existingItem && existingItem.due < today) return 85
  if (input.delayed && input.mixed) return 42
  return 58
}

export function buildReviewItemUpdate(
  skillId: string,
  input: AttemptInput,
  masteryScore: number,
  retentionScore: number,
  existingQueue: ReviewItem[],
  today = todayIso(),
): ReviewItem {
  const existingItem = existingQueue.find((item) => item.skillId === skillId)
  const grade = attemptToFsrsGrade(input)
  const fsrsResult = scheduleFsrsReview(existingItem?.fsrs, grade, new Date(`${today}T12:00:00`))
  const heuristicDays = nextReviewIntervalDays(input, masteryScore, {
    retentionScore,
    existingItem,
    today,
  })
  const intervalDays = Math.max(1, Math.round((fsrsResult.intervalDays + heuristicDays) / 2))
  const due = addDaysFrom(intervalDays, today)

  return {
    id: existingItem?.id ?? `review-${skillId}`,
    skillId,
    due,
    intervalDays,
    priority: reviewPriority(input, masteryScore, { retentionScore, existingItem, today }),
    reason: `${reviewReason(input, existingItem, today)} (FSRS interval ${fsrsResult.intervalDays}d)`,
    fsrs: fsrsResult.card,
  }
}

function reviewReason(input: AttemptInput, existingItem: ReviewItem | undefined, today: string): string {
  if (!input.correct) {
    if (existingItem && existingItem.due < today) return 'Overdue review miss; schedule immediate repair.'
    return 'Recent miss; schedule repair or review.'
  }
  if (input.hintCount > 0) return 'Correct with hints; shorten interval until retrieval is independent.'
  if (input.delayed && input.mixed) return 'Delayed mixed success; schedule a longer retention check.'
  return 'Correct, but needs spaced evidence before mastery is trusted.'
}

function addDaysFrom(days: number, fromIso: string): string {
  const date = new Date(fromIso)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function upsertReviewItem(queue: ReviewItem[], item: ReviewItem): ReviewItem[] {
  return [item, ...queue.filter((queued) => queued.skillId !== item.skillId)].sort(
    (a, b) => a.due.localeCompare(b.due) || b.priority - a.priority,
  )
}

export function dueReviews(queue: ReviewItem[], today = todayIso()): ReviewItem[] {
  return queue.filter((item) => item.due <= today).sort((a, b) => b.priority - a.priority)
}
