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
  const trend = analytics.masteryImprovementTrend
  const trendLabel =
    trend.direction === 'up'
      ? `+${trend.deltaPct} pts vs prior week`
      : trend.direction === 'down'
        ? `${trend.deltaPct} pts vs prior week`
        : 'Flat vs prior week'

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
          {analytics.mistakePatternTop.map((pattern) => (
            <li key={pattern.tag}>
              <span>
                {pattern.tag.replaceAll('_', ' ')} ×{pattern.count}
              </span>
            </li>
          ))}
          {!analytics.mistakePatternTop.length && <li className="muted">No repeated patterns yet.</li>}
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
          {analytics.resourceEffectivenessTop.map((resource) => (
            <li key={resource.id}>
              <div className="resource-rank-row">
                <span>{resource.title}</span>
                <span className="effectiveness-pill">{resource.score}%</span>
              </div>
              <p className="muted">{resource.source}</p>
            </li>
          ))}
        </ul>
      </section>

      {state.advancedMode && (
        <section className="panel report-advanced">
          <h2>Advanced analytics</h2>
          <div className="analytics-grid">
            <div className="analytics-stat">
              <p className="eyebrow">Last 7 days avg mastery</p>
              <p className="stat-value">{trend.recent7dAvg}%</p>
            </div>
            <div className="analytics-stat">
              <p className="eyebrow">Prior 7 days</p>
              <p className="stat-value">{trend.prior7dAvg}%</p>
            </div>
            <div className="analytics-stat">
              <p className="eyebrow">Trend</p>
              <p className="stat-value">{trendLabel}</p>
            </div>
          </div>
          {analytics.mistakePatternTop.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>Top mistake patterns</h3>
              <ul className="signal-list">
                {analytics.mistakePatternTop.map((pattern) => (
                  <li key={pattern.tag}>
                    <span>
                      {pattern.tag.replaceAll('_', ' ')} ×{pattern.count}
                      {pattern.note ? ` — ${pattern.note}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analytics.resourceEffectivenessTop.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>Top resources</h3>
              <ul className="resource-rank-list">
                {analytics.resourceEffectivenessTop.map((resource) => (
                  <li key={resource.id}>
                    <div className="resource-rank-row">
                      <span>{resource.title}</span>
                      <span className="effectiveness-pill">{resource.score}%</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

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
