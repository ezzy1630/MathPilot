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
import { chooseNextAction } from '../domain/learningEngine'
import type { MathPilotState } from '../domain/types'

export function ProgressReport({
  state,
  onClose,
}: {
  state: MathPilotState
  onClose: () => void
}) {
  const analytics = buildAnalyticsSnapshot(state)
  const nextAction = chooseNextAction(state)
  const today = new Date().toISOString().slice(0, 10)
  const dueReviews = state.reviewQueue.filter((item) => item.due <= today)
  const repeatedMistakes = Object.values(state.mistakePatterns)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
  const topResources = Object.values(state.resources)
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
    .slice(0, 5)

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

      <section className="panel">
        <h2>Current status</h2>
        <p className="muted">Recommended next focus: {nextAction.title}</p>
      </section>

      <section className="panel report-two-col">
        <div>
          <h2>Strongest skills</h2>
          <ul className="signal-list">
            {analytics.strongestSkills.map((skill) => (
              <li key={skill.skillId}>
                <span>
                  {skill.name}: {skill.score}%
                </span>
              </li>
            ))}
            {!analytics.strongestSkills.length && <li className="muted">Complete more sessions to populate.</li>}
          </ul>
        </div>
        <div>
          <h2>Weakest skills</h2>
          <ul className="signal-list">
            {analytics.weakestSkills.map((skill) => (
              <li key={skill.skillId}>
                <span>
                  {skill.name}: {skill.score}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel">
        <h2>Most repeated mistakes</h2>
        <ul className="signal-list">
          {repeatedMistakes.map((pattern) => (
            <li key={pattern.tag}>
              <span>
                {pattern.tag.replaceAll('_', ' ')} ×{pattern.count}
              </span>
            </li>
          ))}
          {!repeatedMistakes.length && <li className="muted">No repeated patterns yet.</li>}
        </ul>
      </section>

      <section className="panel">
        <h2>Review due</h2>
        <ul className="signal-list">
          {dueReviews.slice(0, 8).map((item) => (
            <li key={item.id}>
              <span>
                {state.skills[item.skillId]?.name ?? item.skillId} — due {item.due} ({item.reason})
              </span>
            </li>
          ))}
          {!dueReviews.length && <li className="muted">Nothing due today.</li>}
        </ul>
      </section>

      <section className="panel">
        <h2>Resource effectiveness</h2>
        <ul className="resource-rank-list">
          {topResources.map((resource) => (
            <li key={resource.id}>
              <div className="resource-rank-row">
                <span>{resource.title}</span>
                <span className="effectiveness-pill">{Math.round(resource.effectivenessScore * 100)}%</span>
              </div>
              <p className="muted">{resource.source}</p>
            </li>
          ))}
        </ul>
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
          <h2>Recent progress (14 days)</h2>
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
