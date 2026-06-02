import { AccessibleModal } from './AccessibleModal'
import { MasteryDimensionBars } from './MasteryDimensionBars'
import { BookOpen, Play, Wrench } from 'lucide-react'
import type { MathPilotState } from '../domain/types'
import { MathText } from './MathText'

export function SkillActionModal({
  skillId,
  state,
  onRepair,
  onReview,
  onLearn,
  onClose,
}: {
  skillId: string
  state: MathPilotState
  onRepair: () => void
  onReview: () => void
  onLearn: () => void
  onClose: () => void
}) {
  const skill = state.skills[skillId]
  const mastery = state.mastery[skillId]
  if (!skill) return null

  return (
    <AccessibleModal title={skill.name} onClose={onClose}>
      <p className="muted">
        {skill.area} · {Math.round((mastery?.masteryScore ?? 0) * 100)}% mastery · {mastery?.masteryState ?? 'Unknown'}
      </p>
      {state.advancedMode && mastery && <MasteryDimensionBars mastery={mastery} />}
      <MathText
        text={skill.commonMistakes[0] ?? 'Choose repair, review, or practice — MathPilot will not pick for you.'}
      />
      <div className="action-row">
        <button type="button" className="primary" onClick={onRepair}>
          <Wrench size={18} />
          Quick repair
        </button>
        <button type="button" className="secondary" onClick={onReview}>
          <BookOpen size={18} />
          Spaced review
        </button>
        <button type="button" className="secondary" onClick={onLearn}>
          <Play size={18} />
          Learn / practice
        </button>
      </div>
    </AccessibleModal>
  )
}
