import type { MasteryState } from '../domain/types'

const styles: Record<MasteryState, string> = {
  Unknown: 'mp-mastery-unknown',
  Weak: 'mp-mastery-weak',
  Learning: 'mp-mastery-learning',
  Developing: 'mp-mastery-learning',
  Solid: 'mp-mastery-solid',
  Mastered: 'mp-mastery-mastered',
  'Needs Review': 'mp-mastery-review',
  Decayed: 'mp-mastery-weak',
}

export function MasteryBadge({ state, pulse }: { state: MasteryState; pulse?: boolean }) {
  return (
    <span className={`mp-mastery-badge ${styles[state] ?? ''} ${pulse ? 'mp-mastery-pulse' : ''}`}>{state}</span>
  )
}
