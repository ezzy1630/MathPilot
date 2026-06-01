import type { Problem } from './types'

export interface GraphPreset {
  label: string
  expression: string
  notes?: string
  domain?: [number, number]
  tangentAt?: number
  taylorCoeffs?: number[]
  signIntervals?: Array<{ from: number; to: number; sign: '+' | '-' | '0' }>
}

export function graphPresetsForProblem(problem: Problem): GraphPreset[] {
  const skillId = problem.skillIds[0]
  switch (skillId) {
    case 'related_rates':
      return [
        { label: 'Related-rates setup', expression: 'r=5', notes: 'Label known rates; differentiate the constraint equation.' },
        { label: 'Expanding circle r(t)', expression: 'r=5', notes: 'Radius vs time — relate dA/dt to dr/dt.' },
        { label: 'Area A = πr²', expression: 'y=pi*x^2', notes: 'Area as function of radius.' },
      ]
    case 'series_intro':
    case 'geometric_series':
      return [
        {
          label: 'Partial sums S_n (Σ 1/2^k)',
          expression: 'y=1-0.5^x',
          notes: 'S_n approaches 1 as n grows — geometric series with |r|<1.',
        },
        {
          label: 'Terms a_n = (1/2)^n',
          expression: 'y=0.5^x',
          domain: [0, 12],
          notes: 'Term size shrinks; partial sums accumulate.',
        },
      ]
    case 'polar_coordinates':
    case 'polar_area':
      return [
        {
          label: 'r = 1 + cos θ',
          expression: 'y=1+cos(x)',
          notes: 'Polar curve sampled to Cartesian x = r cos θ, y = r sin θ.',
        },
        {
          label: 'Circle r = 1',
          expression: 'y=1',
          notes: 'Constant radius — area element (1/2) r² dθ.',
        },
      ]
    case 'parametric_equations':
      return [
        {
          label: 'Circle: x = cos t, y = sin t',
          expression: 'y=sin(x)',
          notes: 'Parametric trace for t ∈ [0, 2π].',
        },
        {
          label: 'Ellipse sample',
          expression: 'y=0.5*sin(x)',
          notes: 'x = cos t, y = (1/2) sin t.',
        },
      ]
    case 'concavity':
    case 'curve_sketching':
    case 'extrema':
      return [
        {
          label: 'f(x)',
          expression: 'y=x^3-3*x',
          domain: [-2.5, 2.5],
          signIntervals: [
            { from: -2.5, to: -1, sign: '-' },
            { from: -1, to: 1, sign: '+' },
            { from: 1, to: 2.5, sign: '-' },
          ],
        },
        { label: "f'(x)", expression: 'y=3*x^2-3', domain: [-2.5, 2.5], tangentAt: 0 },
        { label: "f''(x)", expression: 'y=6*x', domain: [-2.5, 2.5] },
      ]
    case 'riemann_sums':
    case 'definite_integrals':
    case 'area_net_change':
    case 'ftc':
      return [
        { label: 'Integrand', expression: 'y=2*x', domain: [0, 4] },
        { label: 'Area under curve', expression: 'y=x*(4-x)', domain: [0, 4] },
        { label: 'Accumulation view', expression: 'y=x^2', domain: [0, 3] },
      ]
    case 'derivative_definition':
    case 'derivative_rules_basic':
    case 'chain_rule':
      return [
        { label: 'Function', expression: 'y=x^2', domain: [-2, 3], tangentAt: 1 },
        { label: 'Tangent at x=1', expression: 'y=2*x-1', domain: [-2, 3], tangentAt: 1 },
        { label: 'Secant (h=1)', expression: 'y=3*x-2', domain: [-2, 3], tangentAt: 1 },
      ]
    case 'taylor_series':
    case 'taylor_polynomials':
    case 'taylor_error':
      return [
        {
          label: 'sin(x)',
          expression: 'y=sin(x)',
          domain: [-4, 4],
          taylorCoeffs: [0, 1, 0, -1 / 6, 0, 1 / 120],
        },
        {
          label: 'Taylor approx n=3',
          expression: 'y=x-x^3/6',
          domain: [-4, 4],
          taylorCoeffs: [0, 1, 0, -1 / 6],
        },
        {
          label: 'Taylor n=5',
          expression: 'y=x-x^3/6+x^5/120',
          domain: [-4, 4],
          taylorCoeffs: [0, 1, 0, -1 / 6, 0, 1 / 120],
        },
      ]
    case 'slope_fields':
    case 'separable_de':
      return [
        { label: 'dy/dx = x - y', expression: 'y=x', domain: [-3, 3] },
        { label: 'Slope sample', expression: 'y=-x', domain: [-3, 3] },
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

export type BuiltInGraphKind =
  | 'function'
  | 'tangent'
  | 'riemann'
  | 'sign_chart'
  | 'taylor'
  | 'slope_field'
  | 'series_partial_sums'
  | 'polar'
  | 'parametric'
  | 'related_rates_diagram'

export interface BuiltInGraphPresetProps {
  kind: BuiltInGraphKind
  fn?: (x: number) => number
  domain?: [number, number]
  tangentAt?: number
  taylorCoeffs?: number[]
  signIntervals?: Array<{ from: number; to: number; sign: '+' | '-' | '0' }>
  title?: string
  /** Common ratio r for Σ r^k partial sums (default 1/2). */
  seriesRatio?: number
  seriesTerms?: number
  polarR?: (theta: number) => number
  parametricX?: (t: number) => number
  parametricY?: (t: number) => number
  parametricDomain?: [number, number]
}

export function builtInGraphKindForSkill(skillId?: string): BuiltInGraphKind | null {
  if (!skillId) return null
  if (['series_intro', 'geometric_series'].includes(skillId)) return 'series_partial_sums'
  if (['polar_coordinates', 'polar_area'].includes(skillId)) return 'polar'
  if (['parametric_equations'].includes(skillId)) return 'parametric'
  if (skillId === 'related_rates') return 'related_rates_diagram'
  if (['taylor_series', 'taylor_polynomials', 'taylor_error'].includes(skillId)) return 'taylor'
  if (['slope_fields', 'separable_de'].includes(skillId)) return 'slope_field'
  if (['riemann_sums', 'definite_integrals', 'area_net_change'].includes(skillId)) return 'riemann'
  if (['derivative_definition', 'tangent_instantaneous'].includes(skillId)) return 'tangent'
  if (['concavity', 'extrema', 'curve_sketching', 'first_derivative_test', 'second_derivative_test'].includes(skillId))
    return 'sign_chart'
  return 'function'
}

/** Partial sum S_n = Σ_{k=1}^{n} r^k for geometric-style terms (e.g. r = 1/2). */
export function partialSumGeometric(n: number, ratio: number): number {
  if (n <= 0) return 0
  if (Math.abs(ratio - 1) < 1e-9) return n
  return (ratio * (1 - ratio ** n)) / (1 - ratio)
}

export function externalGraphUrls(expression: string) {
  const expr = expression.replace(/^y=/, '')
  return {
    desmos: `https://www.desmos.com/calculator?lang=en&expressions=${encodeURIComponent(expression)}`,
    geogebra: `https://www.geogebra.org/graphing?lang=en`,
    wolfram: `https://www.wolframalpha.com/input?i=plot+${encodeURIComponent(expr)}`,
  }
}

/** Parse a preset expression like y=x^3-3*x into an evaluable function. */
export function expressionToFn(expression: string): (x: number) => number {
  let expr = expression.replace(/^y=/, '').trim()
  expr = expr.replace(/\^/g, '**')
  expr = expr.replace(/\bpi\b/gi, 'Math.PI')
  expr = expr.replace(/\bsin\(/g, 'Math.sin(')
  expr = expr.replace(/\bcos\(/g, 'Math.cos(')
  expr = expr.replace(/\btan\(/g, 'Math.tan(')
  expr = expr.replace(/\bsqrt\(/g, 'Math.sqrt(')
  expr = expr.replace(/\babs\(/g, 'Math.abs(')
  try {
    const fn = new Function('x', `return (${expr});`) as (x: number) => number
    return (x: number) => {
      const y = fn(x)
      return Number.isFinite(y) ? y : NaN
    }
  } catch {
    return (x: number) => x * x
  }
}

const DEFAULT_DOMAIN: [number, number] = [-3, 3]

/** Skill-specific defaults merged with the active graph preset for BuiltInGraph. */
export function builtInGraphPropsForProblem(problem: Problem, presetIndex = 0): BuiltInGraphPresetProps | null {
  const skillId = problem.skillIds[0]
  const kind = builtInGraphKindForSkill(skillId)
  if (!kind) return null

  const presets = graphPresetsForProblem(problem)
  const preset = presets[presetIndex] ?? presets[0]
  if (!preset) return null

  const domain = preset.domain ?? DEFAULT_DOMAIN
  const fn = preset.expression ? expressionToFn(preset.expression) : undefined
  const title = preset.label

  if (kind === 'series_partial_sums') {
    return {
      kind,
      title,
      seriesRatio: 0.5,
      seriesTerms: 12,
      domain: [0, 13],
    }
  }

  if (kind === 'polar') {
    return {
      kind,
      title,
      polarR: (theta: number) => 1 + Math.cos(theta),
    }
  }

  if (kind === 'parametric') {
    return {
      kind,
      title,
      parametricX: (t: number) => Math.cos(t),
      parametricY: (t: number) => Math.sin(t),
      parametricDomain: [0, 2 * Math.PI],
    }
  }

  if (kind === 'related_rates_diagram') {
    return { kind, title }
  }

  if (!fn) return null

  return {
    kind,
    fn,
    domain,
    tangentAt: preset.tangentAt ?? (kind === 'tangent' ? 1 : undefined),
    taylorCoeffs: preset.taylorCoeffs ?? (kind === 'taylor' ? [0, 1, 0, -1 / 6] : undefined),
    signIntervals:
      preset.signIntervals ??
      (kind === 'sign_chart'
        ? [
            { from: domain[0], to: 0, sign: '-' },
            { from: 0, to: domain[1], sign: '+' },
          ]
        : undefined),
    title,
  }
}
