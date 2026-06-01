import type { ActivityKind, AttemptInput } from './types'

export function attemptModeForActivity(kind: ActivityKind): AttemptInput['mode'] {
  if (kind === 'diagnostic') return 'diagnostic'
  if (kind === 'mixed_review') return 'review'
  if (kind === 'independent_practice') return 'independent'
  if (kind === 'homework_review') return 'homework'
  return 'guided'
}
