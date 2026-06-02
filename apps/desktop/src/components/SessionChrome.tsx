import { sessionPhaseLabel } from '../domain/dailySessionEngine'
import type { ActivityKind, MathPilotState } from '../domain/types'

export function SessionChrome({
  state,
  diagnosticProgress,
}: {
  state: MathPilotState
  diagnosticProgress?: string
}) {
  const session = state.dailySession
  const quick = state.quickRepair
  const test = state.testOut
  const diagnostic = state.diagnostic && !state.diagnostic.completed ? state.diagnostic : undefined

  let label = 'Practice session'
  let phaseKind: ActivityKind | 'diagnostic' | 'test_out' | 'quick_repair' = 'guided_practice'

  if (diagnostic) {
    label = 'Adaptive diagnostic'
    phaseKind = 'diagnostic'
  } else if (test && !test.completed) {
    label = 'Prerequisite test-out'
    phaseKind = 'test_out'
  } else if (quick) {
    label = `Quick repair · ${state.skills[quick.skillId]?.name ?? quick.skillId}`
    phaseKind = 'quick_repair'
  } else if (session) {
    label = sessionPhaseLabel(session.phases[session.phaseIndex] as ActivityKind)
    phaseKind = session.phases[session.phaseIndex]
  }

  const sessionProgress = session
    ? ((session.phaseIndex + session.itemsCompletedInPhase / Math.max(session.itemsTargetInPhase, 1)) /
        session.phases.length) *
      100
    : diagnostic
      ? (diagnostic.answeredCount / Math.max(diagnostic.targetCount, 1)) * 100
      : test && !test.completed
        ? ((test.currentIndex + 1) / Math.max(test.queue.length, 1)) * 100
        : quick
          ? (quick.phaseIndex / 5) * 100
          : undefined

  const progressLabel =
    diagnosticProgress ??
    (diagnostic
      ? `Question ${Math.min(diagnostic.answeredCount + 1, diagnostic.targetCount)} of ${diagnostic.targetCount}`
      : session
        ? `Phase ${session.phaseIndex + 1} of ${session.phases.length}`
        : undefined)

  return (
    <div className={`session-chrome session-chrome-${phaseKind}`}>
      <div className="session-chrome-top">
        <span className="session-chrome-label">{label}</span>
        {progressLabel && <span className="session-chrome-meta">{progressLabel}</span>}
      </div>
      {sessionProgress !== undefined && sessionProgress > 0 && (
        <div
          className="session-timeline"
          role="progressbar"
          aria-valuenow={Math.round(sessionProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span className="session-timeline-fill" style={{ width: `${Math.min(100, sessionProgress)}%` }} />
        </div>
      )}
      {session && (
        <div className="session-phase-dots">
          {session.phases.map((phase, i) => (
            <span
              key={phase}
              className={`phase-dot ${i === session.phaseIndex ? 'active' : ''} ${i < session.phaseIndex ? 'done' : ''}`}
              title={sessionPhaseLabel(phase)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
