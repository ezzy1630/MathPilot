import { Play } from 'lucide-react'
import type { Problem } from '../domain/types'

export function SimilarExamplePanel({
  problem,
  onTrySimilar,
}: {
  problem: Problem
  onTrySimilar?: () => void
}) {
  const lines = problem.workedExample ?? []
  if (!lines.length) {
    return (
      <div className="mini-panel similar-panel">
        <h3>Similar example</h3>
        <p className="muted">No worked example on file for this skill yet.</p>
      </div>
    )
  }

  return (
    <div className="mini-panel similar-panel">
      <div className="similar-head">
        <h3>Similar example</h3>
        {onTrySimilar && (
          <button type="button" className="ghost small" onClick={onTrySimilar}>
            <Play size={14} />
            Try one like this
          </button>
        )}
      </div>
      <ol className="similar-steps">
        {lines.map((line, i) => (
          <li key={`${line}-${i}`}>
            <span className="step-num">{i + 1}</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
