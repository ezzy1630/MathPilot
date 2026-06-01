import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { buildAnalyticsSnapshot } from '../domain/analyticsEngine'
import type { MathPilotState } from '../domain/types'

export function ProgressReport({
  state,
  onClose,
}: {
  state: MathPilotState
  onClose: () => void
}) {
  const analytics = buildAnalyticsSnapshot(state)

  return (
    <div className="page progress-report">
      <header className="topbar">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Progress report</h1>
        </div>
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </header>

      <section className="analytics-grid">
        <div className="panel analytics-stat">
          <p className="eyebrow">Accuracy</p>
          <p className="stat-value">{analytics.attemptAccuracy}%</p>
        </div>
        <div className="panel analytics-stat">
          <p className="eyebrow">Reviews due</p>
          <p className="stat-value">{analytics.reviewBacklog}</p>
        </div>
        <div className="panel analytics-stat">
          <p className="eyebrow">Diagnostic attempts</p>
          <p className="stat-value">{analytics.diagnosticCount}</p>
        </div>
      </section>

      {state.studyPlan && (
        <section className="panel">
          <h2>Study plan</h2>
          <p className="muted">{state.studyPlan.summary}</p>
          <ol className="study-plan-list">
            {state.studyPlan.steps.slice(0, 6).map((step) => (
              <li key={`${step.skillId}-${step.action}`}>
                <strong>{step.skillName}</strong> — {step.action}
              </li>
            ))}
          </ol>
        </section>
      )}

      {analytics.masteryTrend.length > 0 && (
        <section className="panel chart-panel">
          <h2>Mastery signal (14 days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics.masteryTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--mp-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="avgMastery" stroke="var(--mp-accent)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {analytics.weakestSkills.length > 0 && (
        <section className="panel chart-panel">
          <h2>Focus areas</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={analytics.weakestSkills} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--mp-border)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="var(--mp-accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  )
}
