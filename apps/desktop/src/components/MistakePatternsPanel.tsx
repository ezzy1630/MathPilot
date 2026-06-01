import type { MathPilotState } from '../domain/types'

export function MistakePatternsPanel({ state }: { state: MathPilotState }) {
  const patterns = Object.values(state.mistakePatterns)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  if (!patterns.length) {
    return (
      <div className="panel insight-panel">
        <h3>Mistake patterns</h3>
        <p className="muted">Patterns appear after a few misses — MathPilot will schedule targeted repair.</p>
      </div>
    )
  }

  return (
    <div className="panel insight-panel">
      <h3>Mistake patterns</h3>
      <ul className="mistake-pattern-list">
        {patterns.map((p) => (
          <li key={p.tag}>
            <strong>{p.tag.replaceAll('_', ' ')}</strong>
            <span className="muted">
              ×{p.count} · {p.skillIds.map((id) => state.skills[id]?.name ?? id).join(', ')}
            </span>
            {p.note && <p className="mistake-note">{p.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}
