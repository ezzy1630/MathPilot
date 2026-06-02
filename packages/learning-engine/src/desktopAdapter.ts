import type { LearningEngineContract } from './contracts'
import {
  chooseNextAction,
  createInitialState,
  recordAttempt,
} from '../../../apps/desktop/src/domain/learningEngine'

export const desktopLearningEngineAdapter: LearningEngineContract = {
  createInitialState,
  chooseNextAction,
  recordAttempt,
}
