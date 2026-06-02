import type { MathEngineContract } from './contracts'
import { checkAnswer, checkAnswerAsync } from './checkAnswer'

export const desktopMathEngineAdapter: MathEngineContract = {
  checkAnswer,
  checkAnswerAsync,
}
