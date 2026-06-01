import { useState } from 'react'
import type { MathPilotState } from '../domain/types'
import { AccessibleModal } from './AccessibleModal'

export type CustomPaceAdjustments = NonNullable<MathPilotState['customPaceAdjustments']>

const DEFAULT_ADJUSTMENTS: CustomPaceAdjustments = {
  difficultyBias: 0,
  videoPhaseWeight: 1,
  reviewIntensity: 1,
  introduceNewMaterial: true,
  problemBudget: 8,
  explanationLevel: 'normal',
}

export function CustomPaceModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: CustomPaceAdjustments
  onSave: (adjustments: CustomPaceAdjustments) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<CustomPaceAdjustments>({ ...DEFAULT_ADJUSTMENTS, ...initial })

  return (
    <AccessibleModal title="Custom session pace" onClose={onClose}>
      <p className="muted custom-pace-lead">
        Tune today&apos;s session. Changes apply when you start or continue your daily session.
      </p>
      <form
        className="custom-pace-form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(draft)
        }}
      >
        <div className="settings-row">
          <label htmlFor="custom-problem-budget">Problem budget</label>
          <input
            id="custom-problem-budget"
            type="number"
            min={3}
            max={15}
            value={draft.problemBudget ?? 8}
            onChange={(e) =>
              setDraft({ ...draft, problemBudget: Math.min(15, Math.max(3, Number(e.target.value) || 8)) })
            }
          />
        </div>
        <div className="settings-row">
          <label htmlFor="custom-explanation-level">Explanation level</label>
          <select
            id="custom-explanation-level"
            value={draft.explanationLevel ?? 'normal'}
            onChange={(e) =>
              setDraft({
                ...draft,
                explanationLevel: e.target.value as 'minimal' | 'normal' | 'high',
              })
            }
          >
            <option value="minimal">Minimal</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="settings-row settings-row-stack">
          <label htmlFor="custom-review-intensity">
            Review intensity <span className="muted">({draft.reviewIntensity.toFixed(1)})</span>
          </label>
          <input
            id="custom-review-intensity"
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={draft.reviewIntensity}
            onChange={(e) => setDraft({ ...draft, reviewIntensity: Number(e.target.value) })}
          />
        </div>
        <div className="settings-row settings-row-stack">
          <label htmlFor="custom-difficulty-bias">
            Difficulty bias <span className="muted">({draft.difficultyBias.toFixed(2)})</span>
          </label>
          <input
            id="custom-difficulty-bias"
            type="range"
            min={-0.15}
            max={0.15}
            step={0.01}
            value={draft.difficultyBias}
            onChange={(e) => setDraft({ ...draft, difficultyBias: Number(e.target.value) })}
          />
        </div>
        <div className="settings-row settings-row-stack">
          <label htmlFor="custom-video-weight">
            Video phase weight <span className="muted">({draft.videoPhaseWeight.toFixed(1)})</span>
          </label>
          <input
            id="custom-video-weight"
            type="range"
            min={0.4}
            max={1.5}
            step={0.1}
            value={draft.videoPhaseWeight}
            onChange={(e) => setDraft({ ...draft, videoPhaseWeight: Number(e.target.value) })}
          />
        </div>
        <div className="settings-row">
          <label htmlFor="custom-introduce-new">
            <input
              id="custom-introduce-new"
              type="checkbox"
              checked={draft.introduceNewMaterial}
              onChange={(e) => setDraft({ ...draft, introduceNewMaterial: e.target.checked })}
            />{' '}
            Introduce new material
          </label>
        </div>
        <div className="action-row">
          <button type="submit" className="primary">
            Apply custom pace
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </AccessibleModal>
  )
}
