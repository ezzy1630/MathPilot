import type { Problem } from './types'

export interface GraphPreset {
  label: string
  expression: string
  notes?: string
}

export function graphPresetsForProblem(problem: Problem): GraphPreset[] {
  const skillId = problem.skillIds[0]
  switch (skillId) {
    case 'related_rates':
      return [
        { label: 'Expanding circle r(t)', expression: 'r=5', notes: 'Radius vs time — relate dA/dt to dr/dt.' },
        { label: 'Area A = πr²', expression: 'y=pi*x^2', notes: 'Area as function of radius.' },
      ]
    case 'concavity':
    case 'curve_sketching':
    case 'extrema':
      return [
        { label: 'f(x)', expression: 'y=x^3-3*x' },
        { label: "f'(x)", expression: 'y=3*x^2-3' },
        { label: "f''(x)", expression: 'y=6*x' },
      ]
    case 'riemann_sums':
    case 'definite_integrals':
    case 'ftc':
      return [
        { label: 'Integrand', expression: 'y=2*x' },
        { label: 'Accumulation view', expression: 'y=x^2' },
      ]
    case 'taylor_series':
    case 'taylor_polynomials':
      return [
        { label: 'sin(x)', expression: 'y=sin(x)' },
        { label: 'Taylor approx n=3', expression: 'y=x-x^3/6' },
      ]
    case 'limits_intro':
    case 'continuity':
      return [{ label: 'Function', expression: 'y=(x^2-1)/(x-1)' }]
    default:
      return [{ label: 'Problem graph', expression: graphExpressionFallback(problem) }]
  }
}

function graphExpressionFallback(problem: Problem): string {
  const m = problem.prompt.match(/f\(x\)\s*=\s*([^.;]+)/i)
  if (m) return `y=${m[1].replace(/\^/g, '^')}`
  return 'y=x^2'
}

export function primaryGraphExpression(problem: Problem): string {
  return graphPresetsForProblem(problem)[0]?.expression ?? 'y=x^2'
}
