import type { ActivityKind } from './types'
import { SKILL_CATALOG_EXTENSION } from './skillProblemCatalogExtension'

export interface ProblemSpec {
  title: string
  prompt: string
  promptLatex?: string
  expectedAnswer: string
  answerType: 'expression' | 'text'
  difficulty: number
  hintSequence: string[]
  hintSequenceLatex?: string[]
  variables?: string[]
  tags?: string[]
  choices?: string[]
  choiceLatex?: string[]
  workedExample?: string[]
  workedExampleLatex?: string[]
}

export interface PracticeSpec extends ProblemSpec {
  mode: ActivityKind
}

export interface SkillCatalogEntry {
  skillId: string
  diagnostics: ProblemSpec[]
  practice: PracticeSpec[]
}

/** Real checkpoint + practice problems for every skill in the course graph. */
export const SKILL_CATALOG: Record<string, SkillCatalogEntry> = {
  algebra_manipulation: {
    skillId: 'algebra_manipulation',
    diagnostics: [
      {
        title: 'Algebra checkpoint',
        prompt: 'Expand and simplify (2x + 3)(x - 4).',
        expectedAnswer: '2*x^2-5*x-12',
        answerType: 'expression',
        difficulty: 0.3,
        hintSequence: ['Use FOIL or distribution.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Polynomial expansion',
        prompt: 'Expand (x + 2)^2.',
        expectedAnswer: 'x^2+4*x+4',
        answerType: 'expression',
        difficulty: 0.28,
        mode: 'guided_practice',
        hintSequence: ['Apply (a+b)^2 = a^2 + 2ab + b^2.'],
        variables: ['x'],
      },
    ],
  },
  function_notation: {
    skillId: 'function_notation',
    diagnostics: [
      {
        title: 'Function notation checkpoint',
        prompt: 'If f(x) = 2x + 1, find f(3).',
        expectedAnswer: '7',
        answerType: 'expression',
        difficulty: 0.25,
        hintSequence: ['Substitute x = 3 into the rule.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Evaluate a function',
        prompt: 'If g(x) = x^2 - 1, find g(4).',
        expectedAnswer: '15',
        answerType: 'expression',
        difficulty: 0.26,
        mode: 'guided_practice',
        hintSequence: ['Replace x with 4.'],
        variables: ['x'],
      },
    ],
  },
  function_composition: {
    skillId: 'function_composition',
    diagnostics: [
      {
        title: 'Composition checkpoint',
        prompt: 'For f(x) = x^2 and g(x) = 2x + 1, find (f ∘ g)(x).',
        expectedAnswer: '(2*x+1)^2',
        answerType: 'expression',
        difficulty: 0.32,
        hintSequence: ['Substitute g(x) into f.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Composition practice',
        prompt: 'If f(x)=x^2 and g(x)=3x+1, find (f∘g)(x).',
        expectedAnswer: '(3*x+1)^2',
        answerType: 'expression',
        difficulty: 0.32,
        mode: 'guided_practice',
        hintSequence: ['Substitute g(x) into f.'],
        variables: ['x'],
      },
    ],
  },
  trig_values: {
    skillId: 'trig_values',
    diagnostics: [
      {
        title: 'Trig values checkpoint',
        prompt: 'What is sin(π/6)? (exact value)',
        expectedAnswer: '1/2',
        answerType: 'expression',
        difficulty: 0.28,
        hintSequence: ['Recall the unit circle at 30°.'],
      },
    ],
    practice: [
      {
        title: 'Cosine at π/3',
        prompt: 'What is cos(π/3)? (exact value)',
        expectedAnswer: '1/2',
        answerType: 'expression',
        difficulty: 0.28,
        mode: 'guided_practice',
        hintSequence: ['Use the unit circle at 60°.'],
      },
    ],
  },
  solving_equations: {
    skillId: 'solving_equations',
    diagnostics: [
      {
        title: 'Linear equation checkpoint',
        prompt: 'Solve for x: 2x + 5 = 11.',
        expectedAnswer: '3',
        answerType: 'expression',
        difficulty: 0.22,
        hintSequence: ['Isolate x.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Solve linear equation',
        prompt: 'Solve for x: 3x - 7 = 8.',
        expectedAnswer: '5',
        answerType: 'expression',
        difficulty: 0.24,
        mode: 'guided_practice',
        hintSequence: ['Add 7 to both sides first.'],
        variables: ['x'],
      },
    ],
  },
  factoring: {
    skillId: 'factoring',
    diagnostics: [
      {
        title: 'Factoring checkpoint',
        prompt: 'Factor x^2 - 9.',
        expectedAnswer: '(x-3)*(x+3)',
        answerType: 'expression',
        difficulty: 0.3,
        hintSequence: ['This is a difference of squares.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Factor quadratic',
        prompt: 'Factor x^2 + 5x + 6.',
        expectedAnswer: '(x+2)*(x+3)',
        answerType: 'expression',
        difficulty: 0.32,
        mode: 'guided_practice',
        hintSequence: ['Find two numbers that multiply to 6 and add to 5.'],
        variables: ['x'],
      },
    ],
  },
  rational_expressions: {
    skillId: 'rational_expressions',
    diagnostics: [
      {
        title: 'Rational expression checkpoint',
        prompt: 'Simplify (x^2 - 1)/(x - 1) for x ≠ 1.',
        expectedAnswer: 'x+1',
        answerType: 'expression',
        difficulty: 0.34,
        hintSequence: ['Factor the numerator.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Simplify rational',
        prompt: 'Simplify (x^2 - 4)/(x + 2) for x ≠ -2.',
        expectedAnswer: 'x-2',
        answerType: 'expression',
        difficulty: 0.34,
        mode: 'guided_practice',
        hintSequence: ['Factor x^2 - 4.'],
        variables: ['x'],
      },
    ],
  },
  limits_intro: {
    skillId: 'limits_intro',
    diagnostics: [
      {
        title: 'Limits checkpoint',
        prompt: 'Evaluate lim x→1 of (x^2 - 1)/(x - 1).',
        expectedAnswer: '2',
        answerType: 'expression',
        difficulty: 0.38,
        hintSequence: ['Factor the numerator.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Limit evaluation',
        prompt: 'Evaluate lim x→2 of (x^2 - 4)/(x - 2).',
        expectedAnswer: '4',
        answerType: 'expression',
        difficulty: 0.4,
        mode: 'guided_practice',
        hintSequence: ['Factor the numerator.'],
        variables: ['x'],
      },
    ],
  },
  one_sided_limits: {
    skillId: 'one_sided_limits',
    diagnostics: [
      {
        title: 'One-sided limit checkpoint',
        prompt: 'For f(x) = |x|/x, what is lim x→0⁺ f(x)?',
        expectedAnswer: '1',
        answerType: 'expression',
        difficulty: 0.36,
        hintSequence: ['For x > 0, |x|/x = 1.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Left-hand limit',
        prompt: 'For f(x) = (x^2 - 1)/(x - 1), find lim x→1⁻ f(x).',
        expectedAnswer: '2',
        answerType: 'expression',
        difficulty: 0.38,
        mode: 'guided_practice',
        hintSequence: ['Factor and cancel.'],
        variables: ['x'],
      },
    ],
  },
  infinite_limits: {
    skillId: 'infinite_limits',
    diagnostics: [
      {
        title: 'Infinite limits checkpoint',
        prompt: 'Evaluate lim x→∞ of (3x^2 + 1)/(x^2 - 2).',
        expectedAnswer: '3',
        answerType: 'expression',
        difficulty: 0.4,
        hintSequence: ['Divide numerator and denominator by x^2.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Horizontal asymptote',
        prompt: 'Evaluate lim x→∞ of (2x + 1)/(x + 5).',
        expectedAnswer: '2',
        answerType: 'expression',
        difficulty: 0.38,
        mode: 'guided_practice',
        hintSequence: ['Divide top and bottom by x.'],
        variables: ['x'],
      },
    ],
  },
  squeeze_theorem: {
    skillId: 'squeeze_theorem',
    diagnostics: [
      {
        title: 'Squeeze theorem checkpoint',
        prompt: 'Evaluate lim x→0 of x^2*sin(1/x).',
        expectedAnswer: '0',
        answerType: 'expression',
        difficulty: 0.42,
        hintSequence: ['Bound sin(1/x) between -1 and 1.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Squeeze practice',
        prompt: 'Evaluate lim x→0 of x*cos(1/x).',
        expectedAnswer: '0',
        answerType: 'expression',
        difficulty: 0.42,
        mode: 'guided_practice',
        hintSequence: ['Use -|x| ≤ x*cos(1/x) ≤ |x|.'],
        variables: ['x'],
      },
    ],
  },
  continuity: {
    skillId: 'continuity',
    diagnostics: [
      {
        title: 'Continuity checkpoint',
        prompt: 'Is f(x) = (x^2 - 1)/(x - 1) continuous at x = 1 if we define f(1) = 2? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.36,
        hintSequence: ['Check if the limit equals f(1).'],
      },
    ],
    practice: [
      {
        title: 'Continuity at a point',
        prompt: 'Is f(x) = x^2 continuous everywhere? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.3,
        mode: 'guided_practice',
        hintSequence: ['Polynomials are continuous on ℝ.'],
      },
    ],
  },
  derivative_definition: {
    skillId: 'derivative_definition',
    diagnostics: [
      {
        title: 'Derivative definition checkpoint',
        prompt: 'Using the limit definition, find f\'(x) for f(x) = x^2.',
        expectedAnswer: '2*x',
        answerType: 'expression',
        difficulty: 0.44,
        hintSequence: ['Use [f(x+h) - f(x)]/h and simplify.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Limit definition',
        prompt: 'Find the derivative of f(x) = 3x using the limit definition.',
        expectedAnswer: '3',
        answerType: 'expression',
        difficulty: 0.4,
        mode: 'guided_practice',
        hintSequence: ['The difference quotient simplifies to 3.'],
        variables: ['x'],
      },
    ],
  },
  tangent_instantaneous: {
    skillId: 'tangent_instantaneous',
    diagnostics: [
      {
        title: 'Tangent line checkpoint',
        prompt: 'Find the slope of the tangent line to f(x) = x^2 at x = 3.',
        expectedAnswer: '6',
        answerType: 'expression',
        difficulty: 0.38,
        hintSequence: ['The slope is f\'(3).'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Instantaneous rate',
        prompt: 'Find f\'(2) for f(x) = x^3.',
        expectedAnswer: '12',
        answerType: 'expression',
        difficulty: 0.36,
        mode: 'guided_practice',
        hintSequence: ['Differentiate then evaluate at 2.'],
        variables: ['x'],
      },
    ],
  },
  derivative_rules_basic: {
    skillId: 'derivative_rules_basic',
    diagnostics: [
      {
        title: 'Derivative rules checkpoint',
        prompt: 'Differentiate f(x) = 5x^4 - 2x.',
        expectedAnswer: '20*x^3-2',
        answerType: 'expression',
        difficulty: 0.36,
        hintSequence: ['Apply the power rule term by term.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Power rule practice',
        prompt: 'Differentiate f(x) = 4x^5 - 3x + 7.',
        expectedAnswer: '20*x^4-3',
        answerType: 'expression',
        difficulty: 0.35,
        mode: 'guided_practice',
        hintSequence: ['Differentiate each term.'],
        variables: ['x'],
      },
    ],
  },
  product_rule: {
    skillId: 'product_rule',
    diagnostics: [
      {
        title: 'Product rule checkpoint',
        prompt: 'Differentiate f(x) = x^2 * sin(x).',
        expectedAnswer: '2*x*sin(x)+x^2*cos(x)',
        answerType: 'expression',
        difficulty: 0.46,
        hintSequence: ['Use (uv)\' = u\'v + uv\'.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Product rule practice',
        prompt: 'Differentiate y = x * e^x.',
        expectedAnswer: 'x*e^x+e^x',
        answerType: 'expression',
        difficulty: 0.44,
        mode: 'guided_practice',
        hintSequence: ['Apply the product rule.'],
        variables: ['x'],
      },
    ],
  },
  quotient_rule: {
    skillId: 'quotient_rule',
    diagnostics: [
      {
        title: 'Quotient rule checkpoint',
        prompt: 'Differentiate f(x) = (x + 1)/(x - 1).',
        expectedAnswer: '-2/(x-1)^2',
        answerType: 'expression',
        difficulty: 0.48,
        hintSequence: ['Use (u/v)\' = (u\'v - uv\')/v^2.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Quotient rule practice',
        prompt: 'Differentiate y = sin(x)/x.',
        expectedAnswer: '(x*cos(x)-sin(x))/x^2',
        answerType: 'expression',
        difficulty: 0.5,
        mode: 'independent_practice',
        hintSequence: ['Apply the quotient rule.'],
        variables: ['x'],
      },
    ],
  },
  chain_rule: {
    skillId: 'chain_rule',
    diagnostics: [
      {
        title: 'Chain rule checkpoint',
        prompt: 'Differentiate f(x) = (x^2 + 3)^2.',
        expectedAnswer: '4*x*(x^2+3)',
        answerType: 'expression',
        difficulty: 0.44,
        hintSequence: ['Identify outer and inner functions.'],
        variables: ['x'],
      },
      {
        title: 'Chain rule variant',
        prompt: 'Differentiate y = sin(5x^2).',
        expectedAnswer: '10*x*cos(5*x^2)',
        answerType: 'expression',
        difficulty: 0.52,
        hintSequence: ['Outer: sin, inner: 5x^2.'],
        variables: ['x'],
        tags: ['misconception:chain_rule_inner'],
      },
    ],
    practice: [
      {
        title: 'Chain rule: power composition',
        prompt: 'Differentiate f(x) = (3x^2 + 1)^4.',
        expectedAnswer: '24*x*(3*x^2+1)^3',
        answerType: 'expression',
        difficulty: 0.48,
        mode: 'guided_practice',
        hintSequence: ['Identify the outer and inner structure.'],
        variables: ['x'],
        tags: ['misconception:chain_rule_inner'],
      },
      {
        title: 'Chain rule: trig composition',
        prompt: 'Differentiate y = sin(4x^2).',
        expectedAnswer: '8*x*cos(4*x^2)',
        answerType: 'expression',
        difficulty: 0.52,
        mode: 'independent_practice',
        hintSequence: ['The outside function is sine.'],
        variables: ['x'],
      },
    ],
  },
  derivatives_trig: {
    skillId: 'derivatives_trig',
    diagnostics: [
      {
        title: 'Trig derivatives checkpoint',
        prompt: 'Differentiate f(x) = cos(x).',
        expectedAnswer: '-sin(x)',
        answerType: 'expression',
        difficulty: 0.38,
        hintSequence: ['The derivative of cos is -sin.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Trig derivative',
        prompt: 'Differentiate f(x) = sin(3x).',
        expectedAnswer: '3*cos(3*x)',
        answerType: 'expression',
        difficulty: 0.42,
        mode: 'guided_practice',
        hintSequence: ['Use the chain rule with sin.'],
        variables: ['x'],
      },
    ],
  },
  derivatives_exp_log: {
    skillId: 'derivatives_exp_log',
    diagnostics: [
      {
        title: 'Exp/log derivatives checkpoint',
        prompt: 'Differentiate f(x) = e^(3x).',
        expectedAnswer: '3*e^(3*x)',
        answerType: 'expression',
        difficulty: 0.4,
        hintSequence: ['d/dx e^u = u\' e^u.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Logarithmic derivative',
        prompt: 'Differentiate f(x) = ln(x).',
        expectedAnswer: '1/x',
        answerType: 'expression',
        difficulty: 0.36,
        mode: 'guided_practice',
        hintSequence: ['The derivative of ln(x) is 1/x.'],
        variables: ['x'],
      },
    ],
  },
  implicit_differentiation: {
    skillId: 'implicit_differentiation',
    diagnostics: [
      {
        title: 'Implicit diff checkpoint',
        prompt: 'Find dy/dx if x^2 + y^2 = 25.',
        expectedAnswer: '-x/y',
        answerType: 'expression',
        difficulty: 0.48,
        hintSequence: ['Differentiate both sides with respect to x.'],
        variables: ['x', 'y'],
      },
    ],
    practice: [
      {
        title: 'Implicit differentiation',
        prompt: 'Find dy/dx if x*y = 6.',
        expectedAnswer: '-y/x',
        answerType: 'expression',
        difficulty: 0.46,
        mode: 'guided_practice',
        hintSequence: ['Use the product rule on x*y.'],
        variables: ['x', 'y'],
      },
    ],
  },
  implicit_log_diff: {
    skillId: 'implicit_log_diff',
    diagnostics: [
      {
        title: 'Log diff checkpoint',
        prompt: 'Use logarithmic differentiation setup: for y = x^x, ln(y) equals what expression?',
        expectedAnswer: 'x*ln(x)',
        answerType: 'expression',
        difficulty: 0.5,
        hintSequence: ['Take ln of both sides.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Log diff practice',
        prompt: 'For y = x^(2x), after taking ln both sides, ln(y) = ?',
        expectedAnswer: '2*x*ln(x)',
        answerType: 'expression',
        difficulty: 0.52,
        mode: 'independent_practice',
        hintSequence: ['Use ln(a^b) = b ln(a).'],
        variables: ['x'],
      },
    ],
  },
  related_rates: {
    skillId: 'related_rates',
    diagnostics: [
      {
        title: 'Related rates checkpoint',
        prompt: 'A circle\'s radius increases at 3 cm/s. When r=5 cm, how fast is the area increasing?',
        expectedAnswer: '30*pi',
        answerType: 'expression',
        difficulty: 0.5,
        hintSequence: ['A = πr², differentiate with respect to time.'],
      },
    ],
    practice: [
      {
        title: 'Related rates: expanding circle',
        prompt: 'A balloon\'s radius grows at 2 cm/s. When r=4 cm, find dA/dt.',
        expectedAnswer: '16*pi',
        answerType: 'expression',
        difficulty: 0.5,
        mode: 'guided_practice',
        hintSequence: ['Use A = πr² and the chain rule.'],
      },
    ],
  },
  extrema: {
    skillId: 'extrema',
    diagnostics: [
      {
        title: 'Extrema checkpoint',
        prompt: 'Find all critical points of f(x) = x^3 - 3x (give x-values only, comma-separated).',
        expectedAnswer: '-1,1',
        answerType: 'text',
        difficulty: 0.44,
        hintSequence: ['Set f\'(x) = 0.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Critical points',
        prompt: 'Find critical points of f(x) = x^2 - 4x + 3.',
        expectedAnswer: '2',
        answerType: 'expression',
        difficulty: 0.4,
        mode: 'guided_practice',
        hintSequence: ['Solve f\'(x) = 0.'],
        variables: ['x'],
      },
    ],
  },
  concavity: {
    skillId: 'concavity',
    diagnostics: [
      {
        title: 'Concavity checkpoint',
        prompt: 'Where is f(x) = x^3 concave up? Answer: x > 0, x < 0, or all x.',
        expectedAnswer: 'all x',
        answerType: 'text',
        difficulty: 0.38,
        hintSequence: ['Check the sign of f\'\'(x).'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Second derivative test',
        prompt: 'For f(x) = x^4, is f concave up at x = 1? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.36,
        mode: 'guided_practice',
        hintSequence: ['Compute f\'\'(x) = 12x².'],
        variables: ['x'],
      },
    ],
  },
  optimization: {
    skillId: 'optimization',
    diagnostics: [
      {
        title: 'Optimization checkpoint',
        prompt: 'Find the x that minimizes f(x) = x^2 - 6x + 10.',
        expectedAnswer: '3',
        answerType: 'expression',
        difficulty: 0.46,
        hintSequence: ['Find the vertex of the parabola.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Optimization practice',
        prompt: 'A rectangle has perimeter 20. If width = x, find x that maximizes area (square).',
        expectedAnswer: '5',
        answerType: 'expression',
        difficulty: 0.48,
        mode: 'guided_practice',
        hintSequence: ['Area = x(10 - x).'],
        variables: ['x'],
      },
    ],
  },
  curve_sketching: {
    skillId: 'curve_sketching',
    diagnostics: [
      {
        title: 'Curve sketch checkpoint',
        prompt: 'For f(x) = x^2, is the function increasing on (0, ∞)? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.34,
        hintSequence: ['Check the sign of f\' on that interval.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Sign chart',
        prompt: 'For f(x) = x^3 - 3x, is f decreasing on (-1, 1)? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.42,
        mode: 'guided_practice',
        hintSequence: ['f\'(x) = 3x² - 3.'],
        variables: ['x'],
      },
    ],
  },
  linear_approximation: {
    skillId: 'linear_approximation',
    diagnostics: [
      {
        title: 'Linear approximation checkpoint',
        prompt: 'Find L(x), the linearization of f(x) = √x at a = 4 (simplified form).',
        expectedAnswer: '1+x/4',
        answerType: 'expression',
        difficulty: 0.46,
        hintSequence: ['L(x) = f(a) + f\'(a)(x - a).'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Linearization',
        prompt: 'Linearize f(x) = e^x at x = 0.',
        expectedAnswer: '1+x',
        answerType: 'expression',
        difficulty: 0.42,
        mode: 'guided_practice',
        hintSequence: ['f(0) = 1, f\'(0) = 1.'],
        variables: ['x'],
      },
    ],
  },
  newtons_method: {
    skillId: 'newtons_method',
    diagnostics: [
      {
        title: 'Newton\'s method checkpoint',
        prompt: 'One Newton step for f(x)=x^2-2 starting at x₀=1: x₁ = ?',
        expectedAnswer: '3/2',
        answerType: 'expression',
        difficulty: 0.48,
        hintSequence: ['x₁ = x₀ - f(x₀)/f\'(x₀).'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Newton iteration',
        prompt: 'One Newton step for f(x)=x^2-3 at x₀=2 gives x₁ = ?',
        expectedAnswer: '7/4',
        answerType: 'expression',
        difficulty: 0.48,
        mode: 'independent_practice',
        hintSequence: ['Use x - f/f\'.'],
        variables: ['x'],
      },
    ],
  },
  lhopital: {
    skillId: 'lhopital',
    diagnostics: [
      {
        title: 'L\'Hopital checkpoint',
        prompt: 'Evaluate lim x→0 of sin(x)/x.',
        expectedAnswer: '1',
        answerType: 'expression',
        difficulty: 0.4,
        hintSequence: ['This is a 0/0 form; apply L\'Hopital or known limit.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'L\'Hopital practice',
        prompt: 'Evaluate lim x→0 of (e^x - 1)/x.',
        expectedAnswer: '1',
        answerType: 'expression',
        difficulty: 0.42,
        mode: 'guided_practice',
        hintSequence: ['Differentiate numerator and denominator.'],
        variables: ['x'],
      },
    ],
  },
  antiderivatives: {
    skillId: 'antiderivatives',
    diagnostics: [
      {
        title: 'Antiderivative checkpoint',
        prompt: 'Find ∫ 3x^2 dx (antiderivative only, omit +C).',
        expectedAnswer: 'x^3',
        answerType: 'expression',
        difficulty: 0.34,
        hintSequence: ['Reverse the power rule.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Basic antiderivative',
        prompt: 'Find ∫ (4x - 1) dx (omit +C).',
        expectedAnswer: '2*x^2-x',
        answerType: 'expression',
        difficulty: 0.32,
        mode: 'guided_practice',
        hintSequence: ['Integrate term by term.'],
        variables: ['x'],
      },
    ],
  },
  riemann_sums: {
    skillId: 'riemann_sums',
    diagnostics: [
      {
        title: 'Riemann sum checkpoint',
        prompt: 'Approximate ∫₀² x dx using 2 subintervals and right endpoints.',
        expectedAnswer: '3',
        answerType: 'expression',
        difficulty: 0.42,
        hintSequence: ['Δx = 1; evaluate at x = 1 and x = 2.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Left Riemann sum',
        prompt: 'Left-endpoint Riemann sum for ∫₀¹ 2x dx with n=2 subintervals.',
        expectedAnswer: '1/2',
        answerType: 'expression',
        difficulty: 0.4,
        mode: 'guided_practice',
        hintSequence: ['Evaluate at x = 0 and x = 1/2.'],
        variables: ['x'],
      },
    ],
  },
  definite_integrals: {
    skillId: 'definite_integrals',
    diagnostics: [
      {
        title: 'Definite integral checkpoint',
        prompt: 'Evaluate ∫₀¹ 2x dx.',
        expectedAnswer: '1',
        answerType: 'expression',
        difficulty: 0.38,
        hintSequence: ['Antiderivative is x²; evaluate at bounds.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Definite integral',
        prompt: 'Evaluate ∫₀² (3x^2) dx.',
        expectedAnswer: '8',
        answerType: 'expression',
        difficulty: 0.4,
        mode: 'guided_practice',
        hintSequence: ['Antiderivative is x³.'],
        variables: ['x'],
      },
    ],
  },
  ftc: {
    skillId: 'ftc',
    diagnostics: [
      {
        title: 'FTC checkpoint',
        prompt: 'If F(x) = ∫₀ˣ t² dt, find F\'(x).',
        expectedAnswer: 'x^2',
        answerType: 'expression',
        difficulty: 0.4,
        hintSequence: ['FTC Part 1: derivative of accumulation gives integrand.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'FTC application',
        prompt: 'Differentiate ∫₁ˣ sin(t) dt with respect to x.',
        expectedAnswer: 'sin(x)',
        answerType: 'expression',
        difficulty: 0.42,
        mode: 'guided_practice',
        hintSequence: ['Apply FTC Part 1.'],
        variables: ['x'],
      },
    ],
  },
  u_substitution: {
    skillId: 'u_substitution',
    diagnostics: [
      {
        title: 'u-substitution checkpoint',
        prompt: 'Evaluate ∫ 2x*(x^2+1)^3 dx (antiderivative only, +C omitted).',
        expectedAnswer: '(x^2+1)^4/4',
        answerType: 'expression',
        difficulty: 0.48,
        hintSequence: ['Let u = x^2 + 1.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'u-substitution',
        prompt: 'Evaluate ∫ 2x*cos(x^2) dx (antiderivative only).',
        expectedAnswer: 'sin(x^2)',
        answerType: 'expression',
        difficulty: 0.48,
        mode: 'independent_practice',
        hintSequence: ['Let u = x².'],
        variables: ['x'],
      },
    ],
  },
  integration_basics_review: {
    skillId: 'integration_basics_review',
    diagnostics: [
      {
        title: 'Integration review checkpoint',
        prompt: 'Evaluate ∫ x dx (antiderivative only, omit +C).',
        expectedAnswer: 'x^2/2',
        answerType: 'expression',
        difficulty: 0.3,
        hintSequence: ['Reverse the power rule.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Basic integration',
        prompt: 'Evaluate ∫ 5 dx (omit +C).',
        expectedAnswer: '5*x',
        answerType: 'expression',
        difficulty: 0.28,
        mode: 'guided_practice',
        hintSequence: ['∫ k dx = kx.'],
        variables: ['x'],
      },
    ],
  },
  integration_by_parts: {
    skillId: 'integration_by_parts',
    diagnostics: [
      {
        title: 'Integration by parts checkpoint',
        prompt: 'Evaluate ∫ x*cos(x) dx (antiderivative only).',
        expectedAnswer: 'x*sin(x)+cos(x)',
        answerType: 'expression',
        difficulty: 0.52,
        hintSequence: ['Choose u = x, dv = cos(x) dx.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Integration by parts',
        prompt: 'Evaluate ∫ x*e^x dx (answer: F(x) + C, give F(x) only).',
        expectedAnswer: 'x*e^x - e^x',
        answerType: 'expression',
        difficulty: 0.55,
        mode: 'independent_practice',
        hintSequence: ['Use u = x, dv = e^x dx.'],
        variables: ['x'],
      },
    ],
  },
  trig_integrals: {
    skillId: 'trig_integrals',
    diagnostics: [
      {
        title: 'Trig integral checkpoint',
        prompt: 'Evaluate ∫ sin^2(x) dx using identity (omit +C).',
        expectedAnswer: 'x/2-sin(2*x)/4',
        answerType: 'expression',
        difficulty: 0.52,
        hintSequence: ['Use sin²(x) = (1 - cos(2x))/2.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Trig integral',
        prompt: 'Evaluate ∫ cos^2(x) dx (omit +C).',
        expectedAnswer: 'x/2+sin(2*x)/4',
        answerType: 'expression',
        difficulty: 0.52,
        mode: 'independent_practice',
        hintSequence: ['Use the power-reduction identity.'],
        variables: ['x'],
      },
    ],
  },
  trig_substitution: {
    skillId: 'trig_substitution',
    diagnostics: [
      {
        title: 'Trig sub checkpoint',
        prompt: 'Evaluate ∫ 1/sqrt(1-x^2) dx (omit +C).',
        expectedAnswer: 'asin(x)',
        answerType: 'expression',
        difficulty: 0.5,
        hintSequence: ['This is a standard form: arcsin.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Trig substitution',
        prompt: 'Evaluate ∫ 1/(1+x^2) dx (omit +C).',
        expectedAnswer: 'atan(x)',
        answerType: 'expression',
        difficulty: 0.48,
        mode: 'independent_practice',
        hintSequence: ['Standard arctangent form.'],
        variables: ['x'],
      },
    ],
  },
  partial_fractions: {
    skillId: 'partial_fractions',
    diagnostics: [
      {
        title: 'Partial fractions checkpoint',
        prompt: 'Partial fraction form of 1/(x(x+1)): A/x + B/(x+1). What is A?',
        expectedAnswer: '1',
        answerType: 'expression',
        difficulty: 0.46,
        hintSequence: ['Multiply through by x(x+1) and substitute x = 0.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Partial fractions',
        prompt: 'In 1/((x-1)(x+2)) = A/(x-1) + B/(x+2), find A.',
        expectedAnswer: '1/3',
        answerType: 'expression',
        difficulty: 0.48,
        mode: 'independent_practice',
        hintSequence: ['Cover-up method at x = 1.'],
        variables: ['x'],
      },
    ],
  },
  improper_integrals: {
    skillId: 'improper_integrals',
    diagnostics: [
      {
        title: 'Improper integral checkpoint',
        prompt: 'Does ∫₁^∞ 1/x² dx converge? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.44,
        hintSequence: ['This is a p-integral with p = 2 > 1.'],
      },
    ],
    practice: [
      {
        title: 'Improper integral',
        prompt: 'Does ∫₁^∞ 1/x dx converge? Answer yes or no.',
        expectedAnswer: 'no',
        answerType: 'text',
        difficulty: 0.42,
        mode: 'guided_practice',
        hintSequence: ['p = 1, borderline divergent.'],
      },
    ],
  },
  volumes_of_revolution: {
    skillId: 'volumes_of_revolution',
    diagnostics: [
      {
        title: 'Volume of revolution checkpoint',
        prompt: 'Disk method: rotate y = x about x-axis on [0,1]. Integrand for V = π∫ f(x)² dx is?',
        expectedAnswer: 'x^2',
        answerType: 'expression',
        difficulty: 0.48,
        hintSequence: ['Square the radius function.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Washer method setup',
        prompt: 'Rotate y = √x about x-axis on [0,4]. Disk integrand (before π) is?',
        expectedAnswer: 'x',
        answerType: 'expression',
        difficulty: 0.46,
        mode: 'guided_practice',
        hintSequence: ['Radius is √x; square it.'],
        variables: ['x'],
      },
    ],
  },
  arc_length: {
    skillId: 'arc_length',
    diagnostics: [
      {
        title: 'Arc length checkpoint',
        prompt: 'Arc length integrand for y = f(x) is sqrt(1 + ?). Fill in the expression in terms of f\'(x).',
        expectedAnswer: '(f\'(x))^2',
        answerType: 'text',
        difficulty: 0.44,
        hintSequence: ['Standard arc length formula.'],
      },
    ],
    practice: [
      {
        title: 'Arc length setup',
        prompt: 'For y = x^2 on [0,1], the integrand inside sqrt is 1 + ?',
        expectedAnswer: '4*x^2',
        answerType: 'expression',
        difficulty: 0.46,
        mode: 'guided_practice',
        hintSequence: ['f\'(x) = 2x.'],
        variables: ['x'],
      },
    ],
  },
  separable_de: {
    skillId: 'separable_de',
    diagnostics: [
      {
        title: 'Separable DE checkpoint',
        prompt: 'Solve dy/dx = 2y with y(0) = 3. What is y?',
        expectedAnswer: '3*e^(2*x)',
        answerType: 'expression',
        difficulty: 0.48,
        hintSequence: ['Separate variables and integrate.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Separable differential equation',
        prompt: 'Solve dy/dx = y with y(0) = 1.',
        expectedAnswer: 'e^x',
        answerType: 'expression',
        difficulty: 0.44,
        mode: 'guided_practice',
        hintSequence: ['dy/y = dx.'],
        variables: ['x'],
      },
    ],
  },
  sequences: {
    skillId: 'sequences',
    diagnostics: [
      {
        title: 'Sequences checkpoint',
        prompt: 'Find lim n→∞ of 1/n.',
        expectedAnswer: '0',
        answerType: 'expression',
        difficulty: 0.32,
        hintSequence: ['The terms get smaller.'],
        variables: ['n'],
      },
    ],
    practice: [
      {
        title: 'Sequence limit',
        prompt: 'Find lim n→∞ of (2n + 1)/(n + 3).',
        expectedAnswer: '2',
        answerType: 'expression',
        difficulty: 0.36,
        mode: 'guided_practice',
        hintSequence: ['Divide by n.'],
        variables: ['n'],
      },
    ],
  },
  series_intro: {
    skillId: 'series_intro',
    diagnostics: [
      {
        title: 'Series basics checkpoint',
        prompt: 'The series ∑ 1/n diverges. Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.36,
        hintSequence: ['Harmonic series diverges.'],
      },
    ],
    practice: [
      {
        title: 'Series vs sequence',
        prompt: 'Is ∑_{n=1}^∞ 1/n a convergent series? Answer yes or no.',
        expectedAnswer: 'no',
        answerType: 'text',
        difficulty: 0.34,
        mode: 'guided_practice',
        hintSequence: ['This is the harmonic series.'],
      },
    ],
  },
  geometric_series: {
    skillId: 'geometric_series',
    diagnostics: [
      {
        title: 'Geometric series checkpoint',
        prompt: 'Find the sum of ∑_{n=0}^∞ (1/2)^n.',
        expectedAnswer: '2',
        answerType: 'expression',
        difficulty: 0.4,
        hintSequence: ['Use a/(1-r) with |r| < 1.'],
        variables: ['n'],
      },
    ],
    practice: [
      {
        title: 'Geometric series sum',
        prompt: 'Sum of ∑_{n=0}^∞ (1/3)^n?',
        expectedAnswer: '3/2',
        answerType: 'expression',
        difficulty: 0.4,
        mode: 'guided_practice',
        hintSequence: ['a = 1, r = 1/3.'],
        variables: ['n'],
      },
    ],
  },
  divergence_test: {
    skillId: 'divergence_test',
    diagnostics: [
      {
        title: 'Divergence test checkpoint',
        prompt: 'If lim a_n ≠ 0, the series ∑ a_n diverges. For a_n = 1, does the test apply? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.34,
        hintSequence: ['The nth term does not go to 0.'],
      },
    ],
    practice: [
      {
        title: 'nth term test',
        prompt: 'For ∑ 1/n, does lim a_n = 0? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.32,
        mode: 'guided_practice',
        hintSequence: ['1/n → 0, so the test is inconclusive.'],
      },
    ],
  },
  integral_test: {
    skillId: 'integral_test',
    diagnostics: [
      {
        title: 'Integral test checkpoint',
        prompt: 'Does ∑ 1/n² converge by the integral test? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.4,
        hintSequence: ['Compare to ∫ 1/x² dx.'],
      },
    ],
    practice: [
      {
        title: 'Integral test',
        prompt: 'Does ∑ 1/n converge by the integral test? Answer yes or no.',
        expectedAnswer: 'no',
        answerType: 'text',
        difficulty: 0.38,
        mode: 'guided_practice',
        hintSequence: ['∫ 1/x dx diverges.'],
      },
    ],
  },
  series_test_selection: {
    skillId: 'series_test_selection',
    diagnostics: [
      {
        title: 'Series test checkpoint',
        prompt: 'For ∑ 1/n^2, which test directly proves convergence? (answer: p-series)',
        expectedAnswer: 'p-series',
        answerType: 'text',
        difficulty: 0.45,
        hintSequence: ['Compare to 1/n^p.'],
      },
    ],
    practice: [
      {
        title: 'Series convergence',
        prompt: 'Does ∑ 1/n^3 converge? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.45,
        mode: 'mixed_review',
        hintSequence: ['p-series with p = 3 > 1.'],
        variables: ['n'],
      },
    ],
  },
  ratio_test: {
    skillId: 'ratio_test',
    diagnostics: [
      {
        title: 'Ratio test checkpoint',
        prompt: 'For ∑ 1/n!, the ratio limit L equals what?',
        expectedAnswer: '0',
        answerType: 'expression',
        difficulty: 0.46,
        hintSequence: ['a_{n+1}/a_n → 0.'],
        variables: ['n'],
      },
    ],
    practice: [
      {
        title: 'Ratio test',
        prompt: 'For ∑ 2^n/n!, ratio limit L = ?',
        expectedAnswer: '0',
        answerType: 'expression',
        difficulty: 0.48,
        mode: 'independent_practice',
        hintSequence: ['Compute a_{n+1}/a_n.'],
        variables: ['n'],
      },
    ],
  },
  comparison_tests: {
    skillId: 'comparison_tests',
    diagnostics: [
      {
        title: 'Comparison test checkpoint',
        prompt: 'To show ∑ 1/(n^2+1) converges, compare to which series? (answer: 1/n^2)',
        expectedAnswer: '1/n^2',
        answerType: 'text',
        difficulty: 0.42,
        hintSequence: ['Find a larger convergent p-series.'],
      },
    ],
    practice: [
      {
        title: 'Direct comparison',
        prompt: 'Does ∑ 1/n^2 converge? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.38,
        mode: 'guided_practice',
        hintSequence: ['p-series with p = 2.'],
      },
    ],
  },
  alternating_series: {
    skillId: 'alternating_series',
    diagnostics: [
      {
        title: 'Alternating series checkpoint',
        prompt: 'Does ∑ (-1)^n/n converge by the alternating series test? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.4,
        hintSequence: ['Terms decrease to 0 in absolute value.'],
        variables: ['n'],
      },
    ],
    practice: [
      {
        title: 'Alternating series',
        prompt: 'Is ∑ (-1)^n/n conditionally convergent? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.42,
        mode: 'guided_practice',
        hintSequence: ['Converges but not absolutely.'],
        variables: ['n'],
      },
    ],
  },
  power_series: {
    skillId: 'power_series',
    diagnostics: [
      {
        title: 'Power series checkpoint',
        prompt: 'Radius of convergence for ∑ x^n/n! is?',
        expectedAnswer: 'infinity',
        answerType: 'text',
        difficulty: 0.44,
        hintSequence: ['Use the ratio test.'],
        variables: ['x', 'n'],
      },
    ],
    practice: [
      {
        title: 'Power series radius',
        prompt: 'Radius of convergence for ∑ x^n is?',
        expectedAnswer: '1',
        answerType: 'expression',
        difficulty: 0.4,
        mode: 'guided_practice',
        hintSequence: ['Geometric series condition |x| < 1.'],
        variables: ['x', 'n'],
      },
    ],
  },
  power_series_interval: {
    skillId: 'power_series_interval',
    diagnostics: [
      {
        title: 'Interval of convergence checkpoint',
        prompt: 'For ∑ x^n/n, radius R = 1. Does x = 1 converge? Answer yes or no.',
        expectedAnswer: 'no',
        answerType: 'text',
        difficulty: 0.46,
        hintSequence: ['At x = 1 this is the harmonic series.'],
        variables: ['x', 'n'],
      },
    ],
    practice: [
      {
        title: 'Endpoint check',
        prompt: 'For ∑ x^n, is x = -1 in the interval of convergence? Answer yes or no.',
        expectedAnswer: 'yes',
        answerType: 'text',
        difficulty: 0.42,
        mode: 'guided_practice',
        hintSequence: ['Alternating geometric series at x = -1.'],
        variables: ['x', 'n'],
      },
    ],
  },
  taylor_series: {
    skillId: 'taylor_series',
    diagnostics: [
      {
        title: 'Taylor series checkpoint',
        prompt: 'Maclaurin series for e^x starts 1 + x + x²/2! + ... What is the coefficient of x²?',
        expectedAnswer: '1/2',
        answerType: 'expression',
        difficulty: 0.44,
        hintSequence: ['f\'\'(0)/2! for e^x.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Taylor series',
        prompt: 'Maclaurin series for sin(x): coefficient of x³?',
        expectedAnswer: '-1/6',
        answerType: 'expression',
        difficulty: 0.46,
        mode: 'independent_practice',
        hintSequence: ['f\'\'\'(0)/3! = -1/6.'],
        variables: ['x'],
      },
    ],
  },
  taylor_polynomials: {
    skillId: 'taylor_polynomials',
    diagnostics: [
      {
        title: 'Taylor polynomial checkpoint',
        prompt: 'Degree-2 Taylor polynomial for e^x at 0: 1 + x + ?',
        expectedAnswer: 'x^2/2',
        answerType: 'expression',
        difficulty: 0.42,
        hintSequence: ['Include terms through x²/2!.'],
        variables: ['x'],
      },
    ],
    practice: [
      {
        title: 'Taylor polynomial',
        prompt: 'Degree-1 Taylor polynomial for ln(1+x) at 0?',
        expectedAnswer: 'x',
        answerType: 'expression',
        difficulty: 0.4,
        mode: 'guided_practice',
        hintSequence: ['f(0) = 0, f\'(0) = 1.'],
        variables: ['x'],
      },
    ],
  },
  taylor_error: {
    skillId: 'taylor_error',
    diagnostics: [
      {
        title: 'Taylor error checkpoint',
        prompt: 'Lagrange error bound uses the maximum of which derivative on the interval?',
        expectedAnswer: 'n+1',
        answerType: 'text',
        difficulty: 0.44,
        hintSequence: ['The (n+1)th derivative appears in the remainder.'],
      },
    ],
    practice: [
      {
        title: 'Error bound concept',
        prompt: 'For degree-n Taylor polynomial, remainder involves f^{(?)}, fill in the order.',
        expectedAnswer: 'n+1',
        answerType: 'text',
        difficulty: 0.42,
        mode: 'guided_practice',
        hintSequence: ['One derivative higher than the polynomial degree.'],
      },
    ],
  },
  parametric_equations: {
    skillId: 'parametric_equations',
    diagnostics: [
      {
        title: 'Parametric checkpoint',
        prompt: 'For x = t², y = t³, find dy/dx.',
        expectedAnswer: '3*t/2',
        answerType: 'expression',
        difficulty: 0.46,
        hintSequence: ['dy/dx = (dy/dt)/(dx/dt).'],
        variables: ['t'],
      },
    ],
    practice: [
      {
        title: 'Parametric derivative',
        prompt: 'For x = cos(t), y = sin(t), find dy/dx.',
        expectedAnswer: '-cot(t)',
        answerType: 'expression',
        difficulty: 0.48,
        mode: 'independent_practice',
        hintSequence: ['Compute dy/dt and dx/dt.'],
        variables: ['t'],
      },
    ],
  },
  parametric_derivatives: {
    skillId: 'parametric_derivatives',
    diagnostics: [
      {
        title: 'Parametric derivative checkpoint',
        prompt: 'For x = 2t, y = t², find dy/dx at t = 1.',
        expectedAnswer: '1',
        answerType: 'expression',
        difficulty: 0.44,
        hintSequence: ['dy/dx = (dy/dt)/(dx/dt).'],
        variables: ['t'],
      },
    ],
    practice: [
      {
        title: 'Parametric slope',
        prompt: 'For x = t, y = t², find dy/dx.',
        expectedAnswer: '2*t',
        answerType: 'expression',
        difficulty: 0.42,
        mode: 'guided_practice',
        hintSequence: ['Differentiate each with respect to t.'],
        variables: ['t'],
      },
    ],
  },
  polar_coordinates: {
    skillId: 'polar_coordinates',
    diagnostics: [
      {
        title: 'Polar coordinates checkpoint',
        prompt: 'Convert (r, θ) = (2, π/3) to Cartesian: x = ?',
        expectedAnswer: '1',
        answerType: 'expression',
        difficulty: 0.4,
        hintSequence: ['x = r cos(θ).'],
      },
    ],
    practice: [
      {
        title: 'Polar to Cartesian',
        prompt: 'For (r, θ) = (1, π), find y.',
        expectedAnswer: '0',
        answerType: 'expression',
        difficulty: 0.38,
        mode: 'guided_practice',
        hintSequence: ['y = r sin(θ).'],
      },
    ],
  },
  polar_area: {
    skillId: 'polar_area',
    diagnostics: [
      {
        title: 'Polar area checkpoint',
        prompt: 'Area in polar: dA = (1/2) r² dθ. Area of one petal of r = sin(θ) setup uses integrand?',
        expectedAnswer: 'sin(theta)^2/2',
        answerType: 'expression',
        difficulty: 0.48,
        hintSequence: ['Substitute r = sin(θ) into (1/2)r².'],
        variables: ['theta'],
      },
    ],
    practice: [
      {
        title: 'Polar area setup',
        prompt: 'For r = 2, area of circle in polar: integrand (before 1/2 factor) is?',
        expectedAnswer: '4',
        answerType: 'expression',
        difficulty: 0.4,
        mode: 'guided_practice',
        hintSequence: ['r² = 4.'],
      },
    ],
  },
  ...SKILL_CATALOG_EXTENSION,
}

export function catalogSkillIds(): string[] {
  return Object.keys(SKILL_CATALOG)
}

export function hasCatalogEntry(skillId: string): boolean {
  return skillId in SKILL_CATALOG
}
