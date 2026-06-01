import type { MathPilotState } from './types'

export function motivationLine(state: MathPilotState, event: 'correct' | 'review_due' | 'repair' | 'mastery'): string {
  const tone = state.preferences?.tone ?? 'warm'
  const direct = tone === 'direct'
  if (event === 'correct') {
    return direct ? 'Correct — evidence recorded.' : 'Nice — that strengthens your map.'
  }
  if (event === 'review_due') {
    return direct ? 'Review due. Retrieval now.' : 'Review ready — a few minutes now saves relearning later.'
  }
  if (event === 'repair') {
    return direct ? 'Repair this gap before pushing forward.' : 'Quick repair will make the next topic smoother.'
  }
  return direct ? 'Mastery signal updated.' : 'Progress saved — your map is getting sharper.'
}
