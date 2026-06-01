import { Map } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { MathPilotState } from '../domain/types'
import { areaReadiness, groupByArea, readiness } from '../lib/mapHelpers'

function areaBarColor(score: number): string {
  if (score < 40) return 'var(--mp-mastery-weak)'
  if (score < 55) return 'var(--mp-mastery-learning)'
  if (score < 72) return 'var(--mp-mastery-solid)'
  return 'var(--mp-mastery-mastered)'
}

export function TodayMasteryStrip({
  state,
  onOpenMap,
}: {
  state: MathPilotState
  onOpenMap: () => void
}) {
  const readinessValue = readiness(state)
  const weakCount = Object.values(state.mastery).filter((record) => record.masteryScore < 0.4).length
  const weakestAreas = Object.keys(groupByArea(state))
    .map((area) => ({ area, score: areaReadiness(state, area) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)

  return (
    <section className="today-mastery-strip" aria-label="Course mastery overview">
      <div className="today-mastery-ring">
        <div className="ring today-mastery-ring-graphic" style={{ '--value': readinessValue } as CSSProperties}>
          <span>{readinessValue}%</span>
        </div>
        <span className="today-mastery-ring-label">Course readiness</span>
      </div>

      <div className="today-mastery-areas">
        {weakestAreas.length > 0 ? (
          weakestAreas.map(({ area, score }) => (
            <div className="today-mastery-area-bar" key={area}>
              <div className="today-mastery-area-bar-head">
                <span>{area}</span>
                <strong>{score}%</strong>
              </div>
              <div className="today-mastery-area-bar-track" aria-hidden>
                <div
                  className="today-mastery-area-bar-fill"
                  style={{ width: `${score}%`, background: areaBarColor(score) }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="today-mastery-empty">Complete a session to calibrate your map.</p>
        )}
      </div>

      <div className="today-mastery-meta">
        <span className="today-mastery-weak-count">
          {weakCount} weak skill{weakCount === 1 ? '' : 's'}
        </span>
        <button type="button" className="today-mastery-map-link" onClick={onOpenMap}>
          <Map size={16} aria-hidden />
          Open map
        </button>
      </div>
    </section>
  )
}
