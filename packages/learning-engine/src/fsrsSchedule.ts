import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type Grade,
} from 'ts-fsrs'

/** Serializable FSRS card state stored on ReviewItem. */
export interface FsrsCardState {
  stability: number
  difficulty: number
  scheduled_days: number
  reps: number
  lapses: number
  state: number
  last_review?: string
  due?: string
}

const scheduler = fsrs(
  generatorParameters({
    enable_short_term: false,
    maximum_interval: 120,
  }),
)

export function emptyFsrsCardState(): FsrsCardState {
  const card = createEmptyCard(new Date())
  return cardToState(card)
}

export function cardToState(card: Card): FsrsCardState {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.toISOString(),
    due: card.due.toISOString(),
  }
}

export function stateToCard(state: FsrsCardState): Card {
  return {
    stability: state.stability,
    difficulty: state.difficulty,
    scheduled_days: state.scheduled_days,
    elapsed_days: 0,
    learning_steps: 0,
    reps: state.reps,
    lapses: state.lapses,
    state: state.state as Card['state'],
    due: state.due ? new Date(state.due) : new Date(),
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  }
}

/** Map attempt quality to FSRS grade (1=Again … 4=Easy). */
export function attemptToFsrsGrade(input: {
  correct: boolean
  hintCount: number
  seconds: number
  delayed?: boolean
  mixed?: boolean
}): Grade {
  if (!input.correct) return Rating.Again
  if (input.hintCount >= 2) return Rating.Hard
  if (input.hintCount > 0) return Rating.Hard
  if (input.seconds >= 180) return Rating.Hard
  if (input.delayed && input.mixed) return Rating.Easy
  if (input.seconds < 75) return Rating.Easy
  return Rating.Good
}

export function scheduleFsrsReview(
  prior: FsrsCardState | undefined,
  grade: Grade,
  now = new Date(),
): { card: FsrsCardState; intervalDays: number } {
  const card = prior ? stateToCard(prior) : createEmptyCard(now)
  const record = scheduler.repeat(card, now)[grade]
  const next = record.card
  const intervalDays = Math.max(1, Math.round(next.scheduled_days))
  return { card: cardToState(next), intervalDays }
}

export { Rating as FsrsRating }
