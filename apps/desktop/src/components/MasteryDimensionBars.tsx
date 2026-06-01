import type { MasteryRecord } from '../domain/types'

const DIMENSIONS = [
  { key: 'fluency', label: 'Fluency', field: 'fluencyScore' as const },
  { key: 'conceptual', label: 'Concept', field: 'conceptualScore' as const },
  { key: 'procedural', label: 'Procedure', field: 'proceduralScore' as const },
  { key: 'transfer', label: 'Transfer', field: 'transferScore' as const },
]

export function MasteryDimensionBars({ mastery }: { mastery: MasteryRecord }) {
  return (
    <div className="mastery-dimension-bars" aria-label="Mastery dimensions">
      {DIMENSIONS.map(({ key, label, field }) => {
        const pct = Math.round(mastery[field] * 100)
        return (
          <div key={key} className="mastery-dimension-row">
            <span className="mastery-dimension-label">{label}</span>
            <div className="mastery-dimension-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="mastery-dimension-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="mastery-dimension-pct">{pct}</span>
          </div>
        )
      })}
    </div>
  )
}
