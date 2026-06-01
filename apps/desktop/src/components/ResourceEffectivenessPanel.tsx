import type { MathPilotState } from '../domain/types'

export function ResourceEffectivenessPanel({ state }: { state: MathPilotState }) {
  const ranked = Object.values(state.resources)
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
    .slice(0, 5)

  return (
    <div className="panel insight-panel">
      <h3>Resource effectiveness</h3>
      <ul className="resource-rank-list">
        {ranked.map((r) => (
          <li key={r.id}>
            <div className="resource-rank-row">
              <span>{r.title}</span>
              <span className={`effectiveness-pill ${r.effectivenessScore >= 0.6 ? 'high' : r.effectivenessScore < 0.4 ? 'low' : ''}`}>
                {Math.round(r.effectivenessScore * 100)}%
              </span>
            </div>
            <p className="muted">{r.source}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
