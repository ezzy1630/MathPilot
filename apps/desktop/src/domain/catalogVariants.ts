import { enrichPracticeSpec, type SkillMetaForEnrichment } from './catalogEnrichment'
import type { PracticeSpec, SkillCatalogEntry } from './skillProblemCatalog'
import type { ActivityKind } from './types'

const MODES: ActivityKind[] = ['guided_practice', 'independent_practice', 'mixed_review']

type VariantFactory = (index: number) => Omit<PracticeSpec, 'mode'>

function practice(
  title: string,
  prompt: string,
  expectedAnswer: string,
  difficulty: number,
  hints: string[],
  extras?: Partial<PracticeSpec>,
): Omit<PracticeSpec, 'mode'> {
  return {
    title,
    prompt,
    expectedAnswer,
    answerType: extras?.answerType ?? 'expression',
    difficulty,
    hintSequence: hints,
    variables: extras?.variables,
    tags: extras?.tags,
    workedExample: extras?.workedExample,
    choices: extras?.choices,
  }
}

/** Parametric practice templates keyed by skill id (fills gaps to minimum pool depth). */
const VARIANT_FACTORIES: Partial<Record<string, VariantFactory[]>> = {
  algebra_manipulation: [
    () => practice('Expand binomial', 'Expand (x + 3)^2.', 'x^2+6*x+9', 0.3, ['Use (a+b)^2.'], { variables: ['x'] }),
    () => practice('Factor quadratic', 'Factor x^2 - 5x + 6.', '(x-2)*(x-3)', 0.32, ['Find two numbers that multiply to 6 and add to -5.'], { variables: ['x'] }),
    () => practice('Distribute', 'Expand 3(x - 2) + 4.', '3*x-2', 0.28, ['Distribute 3 first.'], { variables: ['x'] }),
  ],
  function_notation: [
    () => practice('Evaluate g', 'If g(x) = x^2 - 4, find g(2).', '0', 0.26, ['Substitute x = 2.'], { variables: ['x'] }),
    () =>
      practice('Input interpretation', 'If f(5) = 12, the input is?', '5', 0.24, ['Input is inside parentheses.'], {
        answerType: 'text',
      }),
    () =>
      practice('Output interpretation', 'If f(a) = b, b represents the?', 'output', 0.26, ['f maps input to output.'], {
        answerType: 'text',
      }),
  ],
  trig_values: [
    () => practice('Sin value', 'What is sin(π/4)? (exact value)', 'sqrt(2)/2', 0.28, ['Unit circle at 45°.']),
    () => practice('Tan value', 'What is tan(π/4)? (exact value)', '1', 0.3, ['sin/cos at 45°.']),
    () => practice('Cosine value', 'What is cos(π/6)? (exact value)', 'sqrt(3)/2', 0.28, ['Unit circle at 30°.']),
  ],
  derivative_rules_basic: [
    () => practice('Power rule', 'Differentiate f(x) = x^4.', '4*x^3', 0.3, ['Power rule.'], { variables: ['x'] }),
    () => practice('Constant multiple', 'Differentiate f(x) = 5x^3.', '15*x^2', 0.32, ['Factor out 5.'], { variables: ['x'] }),
    () => practice('Sum rule', 'Differentiate f(x) = x^2 + 3x.', '2*x+3', 0.28, ['Differentiate term by term.'], { variables: ['x'] }),
  ],
  product_rule: [
    () => practice('Product setup', 'Differentiate f(x) = x*e^x.', 'x*e^x+e^x', 0.42, ['Product rule: u=x, v=e^x.'], { variables: ['x'] }),
    () => practice('Product with trig', 'Differentiate f(x) = x*sin(x).', 'x*cos(x)+sin(x)', 0.44, ['uv\' + u\'v.'], { variables: ['x'] }),
    () => practice('Product practice', 'Differentiate f(x) = (x+1)*ln(x).', 'ln(x)+1+1/x', 0.46, ['Choose u and v carefully.'], { variables: ['x'] }),
  ],
  quotient_rule: [
    () => practice('Quotient basic', 'Differentiate f(x) = (x+1)/(x-1).', '-2/(x-1)^2', 0.45, ['Quotient rule.'], { variables: ['x'] }),
    () => practice('Quotient trig', 'Differentiate f(x) = sin(x)/x.', '(x*cos(x)-sin(x))/x^2', 0.48, ['Numerator: u=sin, v=x.'], { variables: ['x'] }),
    () => practice('Quotient e', 'Differentiate f(x) = e^x/x.', '(x*e^x-e^x)/x^2', 0.47, ['Watch sign in numerator.'], { variables: ['x'] }),
  ],
  chain_rule: [
    () =>
      practice(
        'Chain: exponential',
        'Differentiate f(x) = e^(3x).',
        '3*e^(3*x)',
        0.46,
        ['Outer e^u, inner 3x.'],
        {
          variables: ['x'],
          tags: ['misconception:chain_rule_inner'],
          workedExample: ['Let u = 3x.', 'd/dx e^u = e^u · u\' = 3e^(3x).'],
        },
      ),
    () =>
      practice(
        'Chain: cosine',
        'Differentiate y = cos(2x).',
        '-2*sin(2*x)',
        0.44,
        ['Derivative of cos with inner 2x.'],
        { variables: ['x'] },
      ),
    () =>
      practice(
        'Chain: nested power',
        'Differentiate f(x) = (2x + 1)^4.',
        '8*(2*x+1)^3',
        0.48,
        ['Outer power, inner 2x+1.'],
        { variables: ['x'] },
      ),
  ],
  u_substitution: [
    () => practice('u-sub linear', 'Evaluate ∫ 2x cos(x^2) dx (omit +C).', 'sin(x^2)', 0.42, ['Let u = x^2.'], { variables: ['x'] }),
    () => practice('u-sub exponential', 'Evaluate ∫ e^(2x) dx (omit +C).', 'e^(2*x)/2', 0.4, ['Let u = 2x.'], { variables: ['x'] }),
    () => practice('u-sub power', 'Evaluate ∫ x(x^2+1)^3 dx (omit +C).', '(x^2+1)^4/8', 0.45, ['Let u = x^2+1.'], { variables: ['x'] }),
  ],
  integration_by_parts: [
    () =>
      practice(
        'IBP: x cos',
        'Evaluate ∫ x cos(x) dx (omit +C; antiderivative F(x) only).',
        'x*sin(x)+cos(x)',
        0.52,
        ['u = x, dv = cos(x) dx.'],
        { variables: ['x'] },
      ),
    () =>
      practice(
        'IBP: x sin',
        'Evaluate ∫ x sin(x) dx (omit +C; antiderivative F(x) only).',
        '-x*cos(x)+sin(x)',
        0.54,
        ['u = x, dv = sin(x) dx.'],
        { variables: ['x'] },
      ),
    () =>
      practice(
        'IBP: ln',
        'Evaluate ∫ ln(x) dx (omit +C; antiderivative F(x) only).',
        'x*ln(x)-x',
        0.56,
        ['u = ln(x), dv = dx.'],
        { variables: ['x'] },
      ),
  ],
  related_rates: [
    () =>
      practice(
        'Related rates ladder',
        'A ladder 10 ft long slides away; when bottom is 6 ft from wall, bottom moves 2 ft/s. How fast is top sliding? (numeric ft/s, omit units in answer)',
        '-1.5',
        0.5,
        ['Draw diagram; use x^2+y^2=100.'],
        { answerType: 'expression' },
      ),
    () =>
      practice(
        'Related rates cone',
        'Sand pours into a cone at 3 cm³/s; radius equals height. Find dr/dt when r=2 if dV/dt=3.',
        '3/(4*pi)',
        0.52,
        ['Volume of cone V = (1/3)πr²h with r=h.'],
        { variables: ['r'] },
      ),
    () =>
      practice(
        'Related rates balloon',
        'Spherical balloon radius increases 1 cm/s. Find dV/dt when r=5.',
        '100*pi',
        0.48,
        ['V = (4/3)πr³; differentiate w.r.t. t.'],
        { variables: ['r'] },
      ),
  ],
  limits_intro: [
    () => practice('Rational limit', 'Evaluate lim(x→2) (x^2-4)/(x-2).', '4', 0.32, ['Factor numerator.'], { variables: ['x'] }),
    () => practice('Direct sub', 'Evaluate lim(x→3) (x^2+1).', '10', 0.28, ['Substitute x=3.'], { variables: ['x'] }),
    () => practice('Limit laws', 'Evaluate lim(x→0) (3x+2).', '2', 0.26, ['Direct substitution.'], { variables: ['x'] }),
  ],
  optimization: [
    () => practice('Max area', 'Rectangle perimeter 24; maximize area. Max area = ?', '36', 0.48, ['Square maximizes; side 6.'], { answerType: 'expression' }),
    () => practice('Minimize distance', 'Minimize f(x)=x^2-4x+7. x at minimum?', '2', 0.44, ['f\'(x)=0.'], { variables: ['x'] }),
    () => practice('Box volume', 'Square corners cut from 12×12; side cut x gives V= x(12-2x)². Critical x in (0,6)?', '2', 0.5, ['Expand or use product rule on V.'], { variables: ['x'] }),
  ],
  series_test_selection: [
    () =>
      practice('Series test p', 'Does ∑ 1/n^4 converge? Answer yes or no.', 'yes', 0.38, ['p-series with p>1.'], { answerType: 'text' }),
    () =>
      practice('Series test harmonic', 'Does ∑ 1/n converge? Answer yes or no.', 'no', 0.36, ['Harmonic diverges.'], { answerType: 'text' }),
    () =>
      practice('Series test ratio', 'For ∑ 1/2^n, ratio test limit L = ?', '1/2', 0.42, ['Geometric ratio.'], { answerType: 'expression' }),
  ],
  partial_fractions: [
    () => practice('Partial frac setup', 'Partial fractions: 1/(x(x+1)) → A/x + B/(x+1). Find A.', '1', 0.44, ['Cover x=0.'], { variables: ['x'] }),
    () => practice('Partial frac B', 'For 1/(x(x+1)), find B in A/x + B/(x+1).', '-1', 0.45, ['Cover x=-1.'], { variables: ['x'] }),
    () => practice('Simple decomp', 'Write 3/(x-2) as single fraction coefficient at (x-2).', '3', 0.4, ['Already decomposed.'], { variables: ['x'] }),
  ],
  trig_integrals: [
    () => practice('Sin squared', 'Evaluate ∫ sin^2(x) dx (omit +C).', 'x/2-sin(2*x)/4', 0.48, ['Use power reduction.'], { variables: ['x'] }),
    () => practice('Cos squared', 'Evaluate ∫ cos^2(x) dx (omit +C).', 'x/2+sin(2*x)/4', 0.48, ['Power reduction.'], { variables: ['x'] }),
    () => practice('Sin cos', 'Evaluate ∫ sin(x)cos(x) dx (omit +C).', 'sin(x)^2/2', 0.44, ['Let u=sin(x).'], { variables: ['x'] }),
  ],
}

function diagnosticAsPractice(entry: SkillCatalogEntry, index: number): PracticeSpec | null {
  const diag = entry.diagnostics[index % entry.diagnostics.length]
  if (!diag) return null
  const mode = MODES[index % MODES.length]
  return {
    ...diag,
    title: `${diag.title} (practice ${index + 1})`,
    mode,
    difficulty: Math.min(0.75, diag.difficulty + 0.04 * (index + 1)),
  }
}

function promptKey(spec: { prompt: string }): string {
  return spec.prompt.trim().toLowerCase()
}

export const MIN_PRACTICE_PER_SKILL = 3

export function expandPracticePool(entry: SkillCatalogEntry, meta?: SkillMetaForEnrichment): PracticeSpec[] {
  const skillMeta: SkillMetaForEnrichment = meta ?? {
    id: entry.skillId,
    commonMistakes: [],
    type: 'mixed',
    area: 'General',
  }
  const seen = new Set(entry.practice.map(promptKey))
  const pool: PracticeSpec[] = [...entry.practice]

  const defaultFactories: VariantFactory[] = [
    (i) =>
      practice(
        `${entry.skillId} transfer ${i + 1}`,
        `Transfer check (${entry.skillId}): state the first step before computing.`,
        'setup',
        0.32 + i * 0.02,
        ['Read the prompt carefully.', 'Name the method or rule.', 'Then execute algebra.'],
        { answerType: 'text' },
      ),
    (i) =>
      practice(
        `${entry.skillId} fluency ${i + 1}`,
        `Fluency (${entry.skillId}): what common mistake should you watch for?`,
        'signs and setup',
        0.3 + i * 0.02,
        ['Recall a recent error pattern.', 'Write the governing equation or rule.', 'Check units and notation.'],
        { answerType: 'text' },
      ),
    (i) =>
      practice(
        `${entry.skillId} mixed ${i + 1}`,
        `Mixed (${entry.skillId}): explain your method in one phrase.`,
        'method named',
        0.34 + i * 0.02,
        ['Identify givens and unknowns.', 'Pick a standard technique.', 'Verify the result format.'],
        { answerType: 'text' },
      ),
  ]

  const factories = VARIANT_FACTORIES[entry.skillId] ?? defaultFactories
  for (let i = 0; i < factories.length && pool.length < MIN_PRACTICE_PER_SKILL; i += 1) {
    const spec = factories[i](i)
    if (seen.has(promptKey(spec))) continue
    seen.add(promptKey(spec))
    pool.push(
      enrichPracticeSpec(
        {
          ...spec,
          mode: MODES[pool.length % MODES.length],
        },
        skillMeta,
      ),
    )
  }

  let diagIndex = 0
  while (pool.length < MIN_PRACTICE_PER_SKILL && diagIndex < entry.diagnostics.length + 2) {
    const candidate = diagnosticAsPractice(entry, diagIndex)
    diagIndex += 1
    if (!candidate || seen.has(promptKey(candidate))) continue
    seen.add(promptKey(candidate))
    pool.push(enrichPracticeSpec(candidate, skillMeta))
  }

  let safety = 0
  while (pool.length < MIN_PRACTICE_PER_SKILL && safety < 4) {
    safety += 1
    const base = pool[pool.length - 1] ?? entry.diagnostics[0]
    if (!base) break
    const suffix = pool.length + 1
    const extra: PracticeSpec = {
      ...base,
      title: `${base.title} (set ${suffix})`,
      prompt: base.prompt.includes('?')
        ? base.prompt.replace(/\?+$/, ` — check ${suffix}?`)
        : `${base.prompt} (practice set ${suffix})`,
      mode: MODES[pool.length % MODES.length],
      difficulty: Math.min(0.72, base.difficulty + 0.04 * suffix),
    }
    const key = promptKey(extra)
    if (seen.has(key)) break
    seen.add(key)
    pool.push(enrichPracticeSpec(extra, skillMeta))
  }

  return pool
}

/** Parametric coefficient variant for bank export (distinct prompt per variant index). */
export function parametricBankVariant(
  spec: { prompt: string; expectedAnswer: string; title: string; difficulty: number },
  skillId: string,
  variantIndex: number,
): { prompt: string; expectedAnswer: string; title: string; difficulty: number } {
  if (variantIndex === 0) return spec

  const factories = VARIANT_FACTORIES[skillId]
  if (factories?.[variantIndex - 1]) {
    const alt = factories[variantIndex - 1](variantIndex - 1)
    return {
      prompt: alt.prompt,
      expectedAnswer: alt.expectedAnswer,
      title: alt.title,
      difficulty: alt.difficulty,
    }
  }

  const swaps: Array<[RegExp, string, string]> = [
    [/\b2\b/, '3', spec.expectedAnswer.replace(/\b2\b/g, '3')],
    [/\b3\b/, '4', spec.expectedAnswer.replace(/\b3\b/g, '4')],
    [/\b5\b/, '7', spec.expectedAnswer.replace(/\b5\b/g, '7')],
  ]
  const swap = swaps[(variantIndex - 1) % swaps.length]
  const newPrompt = spec.prompt.replace(swap[0], swap[1])
  if (newPrompt === spec.prompt) {
    return {
      ...spec,
      title: `${spec.title} (set ${variantIndex + 1})`,
      difficulty: Math.min(0.78, spec.difficulty + variantIndex * 0.03),
    }
  }
  return {
    prompt: newPrompt,
    expectedAnswer: swap[2],
    title: `${spec.title} (set ${variantIndex + 1})`,
    difficulty: Math.min(0.78, spec.difficulty + variantIndex * 0.03),
  }
}
