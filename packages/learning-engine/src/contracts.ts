import type { AttemptInput, CourseFocus, MathPilotState, NextAction } from '../../../apps/desktop/src/domain/types'

export interface LearningEngineContract {
  createInitialState(currentFocus: CourseFocus): MathPilotState
  chooseNextAction(state: MathPilotState): NextAction
  recordAttempt(state: MathPilotState, input: AttemptInput): MathPilotState
}
