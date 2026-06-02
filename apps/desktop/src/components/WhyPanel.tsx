import { Map } from 'lucide-react'
import { AccessibleModal } from './AccessibleModal'
import type { CoachInsight, NextAction } from '../domain/types'
import type { StudyPlan } from '../domain/studyPlanEngine'
import { MathText } from './MathText'

export function WhyPanel({
  action,
  studyPlan,
  coachInsight,
  onRefreshCoachInsight,
  coachInsightRefreshing,
  onClose,
  onOpenMap,
}: {
  action: NextAction
  studyPlan?: StudyPlan
  coachInsight?: CoachInsight
  onRefreshCoachInsight?: () => void
  coachInsightRefreshing?: boolean
  onClose: () => void
  onOpenMap?: () => void
}) {
  return (
    <AccessibleModal title="Why this step?" onClose={onClose}>
      {coachInsight && (
        <>
          <p className="eyebrow">Coach insight</p>
          <p className="why-lead">{coachInsight.narrative}</p>
          {coachInsight.gapBullets.length > 0 && (
            <ul className="why-steps">
              {coachInsight.gapBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </>
      )}
      <p className="why-lead">{action.reason}</p>
      <div className="why-card">
        <p className="eyebrow">Recommended</p>
        <p className="why-title">{action.title}</p>
        <p className="muted">{action.cta}</p>
      </div>
      {studyPlan && (
        <>
          <p className="eyebrow" style={{ marginTop: 20 }}>
            Study plan
          </p>
          <p className="muted">{studyPlan.summary}</p>
          <ol className="why-steps">
            {studyPlan.steps.slice(0, 5).map((step) => (
              <li key={step.skillId}>
                <strong>{step.skillName}</strong> — <MathText text={step.action} compact as="span" />
              </li>
            ))}
          </ol>
        </>
      )}
      <div className="action-row" style={{ marginTop: 20 }}>
        {onRefreshCoachInsight && (
          <button
            type="button"
            className="secondary"
            onClick={onRefreshCoachInsight}
            disabled={coachInsightRefreshing}
            aria-busy={coachInsightRefreshing || undefined}
            data-testid="why-refresh-coach-insight"
          >
            {coachInsightRefreshing ? 'Refreshing…' : 'Refresh coach insight'}
          </button>
        )}
        {onOpenMap && action.skillIds.length > 0 && (
          <button type="button" className="secondary" onClick={onOpenMap}>
            <Map size={18} />
            View on map
          </button>
        )}
        <button type="button" className="primary" onClick={onClose}>
          Got it
        </button>
      </div>
    </AccessibleModal>
  )
}
