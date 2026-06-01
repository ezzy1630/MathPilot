import { Map, Play, Wrench } from 'lucide-react'
import type { MathPilotState } from '../domain/types'

export function PostDiagnosticScreen({
  state,
  onContinue,
  onStartRepair,
  onOpenMap,
}: {
  state: MathPilotState
  onContinue: () => void
  onStartRepair: (skillId: string) => void
  onOpenMap: () => void
}) {
  const summary = state.diagnostic?.summary
  const topWeakId = summary?.recommendedSkillIds[0]
  const topWeakName = topWeakId ? state.skills[topWeakId]?.name : undefined

  return (
    <div className="page post-diagnostic">
      <p className="eyebrow">Initial knowledge map created</p>
      <h1>Your starting point is ready</h1>
      <p className="lead">
        MathPilot mapped your strengths and gaps across {Object.keys(state.skills).length} skills. Here is where to
        begin.
      </p>
      <section className="panel diagnostic-closure">
        <p>
          <strong>Strong:</strong> {summary?.strong.join(', ') || 'Building evidence…'}
        </p>
        <p>
          <strong>Needs work:</strong> {summary?.weak.join(', ') || '—'}
        </p>
        <p className="reason">{summary?.recommendedNext ?? 'Continue guided practice'}</p>
        <div className="continue-actions">
          <button type="button" className="primary" onClick={onContinue}>
            <Play size={18} />
            Continue
          </button>
          {topWeakId && (
            <button type="button" className="secondary" onClick={() => onStartRepair(topWeakId)}>
              <Wrench size={18} />
              Quick repair{topWeakName ? `: ${topWeakName}` : ''}
            </button>
          )}
          <button type="button" className="secondary" onClick={onOpenMap}>
            <Map size={18} />
            View knowledge map
          </button>
        </div>
      </section>
    </div>
  )
}
