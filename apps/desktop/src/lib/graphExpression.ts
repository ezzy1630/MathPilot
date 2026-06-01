import type { Problem } from '../domain/types'
import { primaryGraphExpression } from '../domain/graphPresets'

export function graphExpressionForProblem(problem: Problem): string {
  return primaryGraphExpression(problem).replace(/\^/g, '^{').replace(/\*\*/g, '^')
}
