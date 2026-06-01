import { Map } from 'lucide-react'
import { Modal } from '../ui/Modal'
import type { NextAction } from '../domain/types'
import type { StudyPlan } from '../domain/studyPlanEngine'

export function WhyPanel({
  action,
  studyPlan,
  onClose,
  onOpenMap,
}: {
  action: NextAction
  studyPlan?: StudyPlan
  onClose: () => void
  onOpenMap?: () => void
}) {
  return (
    <Modal title="Why this step?" onClose={onClose}>
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
                <strong>{step.skillName}</strong> — {step.action}
              </li>
            ))}
          </ol>
        </>
      )}
      <div className="action-row" style={{ marginTop: 20 }}>
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
    </Modal>
  )
}
